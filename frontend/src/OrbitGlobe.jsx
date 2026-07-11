import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { EARTH_ANGULAR_RATE } from './earthRotation'

// Arbitrary fixed epoch. The backend's physics has no real-world time
// reference (no RAAN, no Earth rotation), so this just anchors Cesium's
// clock/timeline to something concrete.
const EPOCH = Cesium.JulianDate.fromIso8601('2026-01-01T00:00:00Z')

const EARTH_RADIUS_KM = 6371

function toCartesian(point) {
  return new Cesium.Cartesian3(point.x * 1000, point.y * 1000, point.z * 1000)
}

// Repeats a spacecraft's single-period track for as long as `totalDuration`
// lasts, so spacecraft with shorter periods visibly complete multiple orbits
// while slower ones complete fewer - the same relative pacing real orbits at
// different altitudes would have.
function buildLoopingPosition(track, period, totalDuration) {
  const positionProperty = new Cesium.SampledPositionProperty()
  positionProperty.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
  positionProperty.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD

  for (let cycleStart = 0; cycleStart <= totalDuration; cycleStart += period) {
    track.forEach(({ time, ...point }, i) => {
      // Every cycle after the first shares its start instant with the
      // previous cycle's end instant (same position too) - skip the dupe.
      if (cycleStart > 0 && i === 0) return
      positionProperty.addSample(
        Cesium.JulianDate.addSeconds(EPOCH, cycleStart + time, new Cesium.JulianDate()),
        toCartesian(point),
      )
    })
  }

  return positionProperty
}

function OrbitGlobe({ stations, allTracks, selectedId, onSelectSpacecraft }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const orbitPathEntitiesRef = useRef([])
  const stationEntitiesRef = useRef([])
  const spacecraftEntitiesRef = useRef([])
  const onSelectSpacecraftRef = useRef(onSelectSpacecraft)

  useEffect(() => {
    onSelectSpacecraftRef.current = onSelectSpacecraft
  }, [onSelectSpacecraft])

  useEffect(() => {
    const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'), {
        maximumLevel: 1, // caps detail for a flatter, less photoreal look
      }),
    )
    // Punchier, more poster-like colors instead of realistic satellite tones.
    baseLayer.saturation = 1.6
    baseLayer.contrast = 1.25

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      selectionIndicator: false,
      infoBox: false,
      skyBox: false,
      skyAtmosphere: false,
      contextOptions: { webgl: { alpha: true } },
    })
    viewer.scene.globe.enableLighting = false
    viewer.scene.globe.showGroundAtmosphere = false
    if (viewer.scene.sun) viewer.scene.sun.show = false
    viewer.scene.fog.enabled = false
    viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT
    // Set once, here, rather than in the per-fleet-update effect below - so a
    // fleet-wide data refresh (e.g. creating an unrelated spacecraft) never
    // snaps every satellite's animation back to the start.
    viewer.clock.currentTime = EPOCH.clone()
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    viewerRef.current = viewer

    // Default framing before any orbit is selected, so stations are visible immediately.
    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, EARTH_RADIUS_KM * 1000 * 1.5),
      { duration: 0 },
    )

    // The globe and everything drawn on it (ground stations) sit in Earth's
    // fixed, surface-rotating frame and never actually move themselves. To
    // make Earth's spin visible, we instead counter-rotate the camera into
    // an inertial frame every frame - the same trick Cesium's own satellite
    // trackers use, but driven by our own simplified rotation rate (rather
    // than Cesium's real-sidereal-time default) so it stays in sync with the
    // backend's simplified physics.
    const spinListener = (scene, time) => {
      if (scene.mode !== Cesium.SceneMode.SCENE3D) return
      const elapsed = Cesium.JulianDate.secondsDifference(time, EPOCH)
      const inertialToFixed = Cesium.Matrix3.fromRotationZ(-EARTH_ANGULAR_RATE * elapsed)
      const offset = Cesium.Cartesian3.clone(viewer.camera.position)
      const transform = Cesium.Matrix4.fromRotationTranslation(inertialToFixed)
      viewer.camera.lookAtTransform(transform, offset)
    }
    viewer.scene.postUpdate.addEventListener(spinListener)

    // Clicking a spacecraft marker (see the allTracks effect below, which
    // tags each entity with a plain .spacecraftId) drives selection back up
    // to the parent, same as picking one from the dropdown.
    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    clickHandler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position)
      if (Cesium.defined(picked) && picked.id && picked.id.spacecraftId != null) {
        onSelectSpacecraftRef.current?.(picked.id.spacecraftId)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      clickHandler.destroy()
      viewer.scene.postUpdate.removeEventListener(spinListener)
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  // Ground stations: fixed set, fixed positions - they visually rotate along
  // with the globe automatically via the camera trick above.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !stations) return

    stationEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity))
    stationEntitiesRef.current = stations.map((s) =>
      viewer.entities.add({
        position: toCartesian(s),
        point: { pixelSize: 6, color: Cesium.Color.RED },
      }),
    )
  }, [stations])

  const validTracks = (allTracks || []).filter((s) => s.track && s.track.length > 0 && s.period > 0)
  const selectedTrack = validTracks.find((s) => s.id === selectedId) ?? null

  // Every spacecraft animates continuously, looping its own track on its own
  // period - shorter-period spacecraft visibly lap slower ones. The selected
  // spacecraft is highlighted and additionally gets its path drawn as a
  // polyline. Clock start/stop/multiplier just grow to fit whichever
  // spacecraft has the longest period; `currentTime` itself is never touched
  // here (only once, at viewer creation above).
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    spacecraftEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity))
    spacecraftEntitiesRef.current = []
    orbitPathEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity))
    orbitPathEntitiesRef.current = []

    if (validTracks.length === 0) return

    const totalDuration = Math.max(...validTracks.map((s) => s.period))
    const stop = Cesium.JulianDate.addSeconds(EPOCH, totalDuration, new Cesium.JulianDate())
    viewer.clock.startTime = EPOCH.clone()
    viewer.clock.stopTime = stop.clone()
    viewer.clock.multiplier = Math.max(totalDuration / 120, 1) // compress the longest orbit into ~2 real minutes
    viewer.clock.shouldAnimate = true
    viewer.timeline.zoomTo(EPOCH, stop)

    spacecraftEntitiesRef.current = validTracks.map((s) => {
      const isSelected = s.id === selectedId
      const entity = viewer.entities.add({
        position: buildLoopingPosition(s.track, s.period, totalDuration),
        point: {
          pixelSize: isSelected ? 10 : 6,
          color: isSelected ? Cesium.Color.YELLOW : Cesium.Color.DEEPSKYBLUE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: isSelected ? 1 : 0,
        },
        label: {
          text: s.name,
          font: '12px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -14),
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
          show: isSelected,
        },
      })
      entity.spacecraftId = s.id
      return entity
    })

    if (selectedTrack) {
      orbitPathEntitiesRef.current.push(
        viewer.entities.add({
          polyline: {
            positions: selectedTrack.track.map(({ time, ...point }) => toCartesian(point)),
            width: 2,
            material: Cesium.Color.CYAN.withAlpha(0.7),
          },
        }),
      )
    }
    // validTracks/selectedTrack are derived fresh from allTracks/selectedId every render, so those two cover this effect's real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks, selectedId])

  // Recenters the camera on the selected spacecraft's orbit. Kept separate
  // from the effect above and keyed on primitive values (id + period, not
  // the allTracks array reference) so an unrelated fleet-wide refresh - which
  // produces a brand new allTracks array even when nothing relevant changed -
  // doesn't yank the camera around. Only an actual selection change, or the
  // selected spacecraft's own orbit changing shape, should recenter it.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    if (!selectedTrack) {
      viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, EARTH_RADIUS_KM * 1000 * 1.5),
        { duration: 0 },
      )
      return
    }

    const maxRadius = Math.max(
      ...selectedTrack.track.map(({ time, ...point }) => Cesium.Cartesian3.magnitude(toCartesian(point))),
    )
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, maxRadius), {
      duration: 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedTrack?.period])

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />
}

export default OrbitGlobe
