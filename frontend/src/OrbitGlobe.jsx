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

function OrbitGlobe({ track, period, stations }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const orbitEntitiesRef = useRef([])
  const stationEntitiesRef = useRef([])

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
    viewer.clock.currentTime = EPOCH.clone()
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

    return () => {
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

  // Selected spacecraft's orbit track, redrawn independently of the station markers above.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    orbitEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity))
    orbitEntitiesRef.current = []

    if (!track || track.length === 0 || !period) return

    const stop = Cesium.JulianDate.addSeconds(EPOCH, period, new Cesium.JulianDate())
    const positionProperty = new Cesium.SampledPositionProperty()
    const pathPositions = track.map(({ time, ...point }) => {
      const cartesian = toCartesian(point)
      positionProperty.addSample(Cesium.JulianDate.addSeconds(EPOCH, time, new Cesium.JulianDate()), cartesian)
      return cartesian
    })

    viewer.clock.startTime = EPOCH.clone()
    viewer.clock.stopTime = stop.clone()
    viewer.clock.currentTime = EPOCH.clone()
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    viewer.clock.multiplier = Math.max(period / 120, 1) // compress one orbit into ~2 real minutes
    viewer.clock.shouldAnimate = true
    viewer.timeline.zoomTo(EPOCH, stop)

    orbitEntitiesRef.current.push(
      viewer.entities.add({
        polyline: {
          positions: pathPositions,
          width: 2,
          material: Cesium.Color.CYAN.withAlpha(0.7),
        },
      }),
    )

    orbitEntitiesRef.current.push(
      viewer.entities.add({
        position: positionProperty,
        point: { pixelSize: 10, color: Cesium.Color.YELLOW },
      }),
    )

    // Center on Earth itself rather than the entities' bounding sphere, which
    // would drift off-center since the orbit isn't symmetric around the origin.
    const maxRadius = Math.max(...pathPositions.map((p) => Cesium.Cartesian3.magnitude(p)))
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, maxRadius), {
      duration: 0,
    })
  }, [track, period])

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />
}

export default OrbitGlobe
