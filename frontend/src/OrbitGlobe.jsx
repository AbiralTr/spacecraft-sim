import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { EARTH_ANGULAR_RATE } from './earthRotation'

const EPOCH = Cesium.JulianDate.fromIso8601('2026-01-01T00:00:00Z')

const EARTH_RADIUS_KM = 6371

function toCartesian(point) {
  return new Cesium.Cartesian3(point.x * 1000, point.y * 1000, point.z * 1000)
}

function buildLoopingPosition(track, period, totalDuration) {
  const positionProperty = new Cesium.SampledPositionProperty()
  positionProperty.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
  positionProperty.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD

  for (let cycleStart = 0; cycleStart <= totalDuration; cycleStart += period) {
    track.forEach(({ time, ...point }, i) => {
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
        maximumLevel: 1,
      }),
    )
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
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    viewerRef.current = viewer

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, EARTH_RADIUS_KM * 1000 * 1.5),
      { duration: 0 },
    )

    const spinListener = (scene, time) => {
      if (scene.mode !== Cesium.SceneMode.SCENE3D) return
      const elapsed = Cesium.JulianDate.secondsDifference(time, EPOCH)
      const inertialToFixed = Cesium.Matrix3.fromRotationZ(-EARTH_ANGULAR_RATE * elapsed)
      const offset = Cesium.Cartesian3.clone(viewer.camera.position)
      const transform = Cesium.Matrix4.fromRotationTranslation(inertialToFixed)
      viewer.camera.lookAtTransform(transform, offset)
    }
    viewer.scene.postUpdate.addEventListener(spinListener)

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
    viewer.clock.multiplier = Math.max(totalDuration / 120, 1)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks, selectedId])

  const hasFramedRef = useRef(false)
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || hasFramedRef.current || !selectedTrack) return

    const maxRadius = Math.max(
      ...selectedTrack.track.map(({ time, ...point }) => Cesium.Cartesian3.magnitude(toCartesian(point))),
    )
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, maxRadius), {
      duration: 0,
    })
    hasFramedRef.current = true
  }, [selectedTrack])

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />
}

export default OrbitGlobe
