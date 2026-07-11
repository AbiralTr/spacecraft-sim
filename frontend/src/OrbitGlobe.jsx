import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

// Arbitrary fixed epoch. The backend's physics has no real-world time
// reference (no RAAN, no Earth rotation), so this just anchors Cesium's
// clock/timeline to something concrete.
const EPOCH = Cesium.JulianDate.fromIso8601('2026-01-01T00:00:00Z')

function toCartesian(point) {
  return new Cesium.Cartesian3(point.x * 1000, point.y * 1000, point.z * 1000)
}

function OrbitGlobe({ track, period, station }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

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
    viewerRef.current = viewer

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !track || track.length === 0 || !period) return

    viewer.entities.removeAll()

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

    viewer.entities.add({
      polyline: {
        positions: pathPositions,
        width: 2,
        material: Cesium.Color.CYAN.withAlpha(0.7),
      },
    })

    viewer.entities.add({
      position: positionProperty,
      point: { pixelSize: 10, color: Cesium.Color.YELLOW },
    })

    if (station) {
      viewer.entities.add({
        position: toCartesian(station),
        point: { pixelSize: 10, color: Cesium.Color.RED },
        label: {
          text: 'Ground Station',
          font: '12px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -16),
          fillColor: Cesium.Color.WHITE,
        },
      })
    }

    // Center on Earth itself rather than the entities' bounding sphere, which
    // would drift off-center since the orbit isn't symmetric around the origin.
    const maxRadius = Math.max(...pathPositions.map((p) => Cesium.Cartesian3.magnitude(p)))
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, maxRadius), {
      duration: 0,
    })
  }, [track, period, station])

  return <div ref={containerRef} style={{ width: '100%', height: 480 }} />
}

export default OrbitGlobe
