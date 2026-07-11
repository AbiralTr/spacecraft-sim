import { useState, useEffect } from 'react'
import { Layout, Form, InputNumber, Button, Card, Descriptions, Typography, Alert, Table } from 'antd'
import OrbitGlobe from './OrbitGlobe'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

// In dev, Vite (5173) and FastAPI (8000) run as separate origins.
// In production, FastAPI serves this app itself, so requests are same-origin.
const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

function App() {
  const [orbitForm] = Form.useForm()
  const orbit = Form.useWatch([], orbitForm) ?? {}

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [windows, setWindows] = useState(null)
  const [windowsError, setWindowsError] = useState(null)
  const [windowsLoading, setWindowsLoading] = useState(false)

  const [groundForm] = Form.useForm()
  const station = Form.useWatch([], groundForm) ?? {}

  const [track, setTrack] = useState(null)
  const [period, setPeriod] = useState(null)
  const [stationPos, setStationPos] = useState(null)

  useEffect(() => {
    if (orbit.altitude == null || orbit.inclination == null || orbit.eccentricity == null) return
    const handle = setTimeout(async () => {
      const params = new URLSearchParams({
        altitude: orbit.altitude,
        inclination: orbit.inclination,
        eccentricity: orbit.eccentricity,
      })
      try {
        const res = await fetch(`${API_BASE}/api/orbit-track?${params.toString()}`)
        if (!res.ok) return
        const data = await res.json()
        setTrack(data.track)
        setPeriod(data.period)
      } catch {
        // ignore transient fetch errors while the form is mid-edit
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [orbit.altitude, orbit.inclination, orbit.eccentricity])

  useEffect(() => {
    if (station.longitude == null || station.latitude == null || station.stationAltitude == null) return
    const handle = setTimeout(async () => {
      const params = new URLSearchParams({
        longitude: station.longitude,
        latitude: station.latitude,
        station_altitude: station.stationAltitude,
      })
      try {
        const res = await fetch(`${API_BASE}/api/ground-station?${params.toString()}`)
        if (!res.ok) return
        setStationPos(await res.json())
      } catch {
        // ignore transient fetch errors while the form is mid-edit
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [station.longitude, station.latitude, station.stationAltitude])

  const onFinishPosition = async (values) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const params = new URLSearchParams({
        time: values.time,
        altitude: values.altitude,
        inclination: values.inclination,
        eccentricity: values.eccentricity,
      })
      const res = await fetch(`${API_BASE}/api/position?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`)
      }
      setResult(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onFinishGroundStation = async (values) => {
    setWindowsLoading(true)
    setWindowsError(null)
    setWindows(null)
    try {
      const params = new URLSearchParams({
        altitude: orbit.altitude,
        inclination: orbit.inclination,
        eccentricity: orbit.eccentricity,
        longitude: values.longitude,
        latitude: values.latitude,
        station_altitude: values.stationAltitude,
      })
      const res = await fetch(`${API_BASE}/api/contact-windows?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Backend returned ${res.status}`)
      }
      setWindows(await res.json())
    } catch (err) {
      setWindowsError(err.message)
    } finally {
      setWindowsLoading(false)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          Spacecraft Simulator
        </Title>
      </Header>

      <Content
        style={{
          maxWidth: 640,
          margin: '48px auto',
          padding: '0 24px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Title level={2}>Spacecraft Position</Title>
        <Paragraph type="secondary">
          Solves Kepler's equation for the given orbit and time, then returns the spacecraft's
          position relative to Earth's center.
        </Paragraph>

        <Card>
          <Form
            form={orbitForm}
            layout="vertical"
            onFinish={onFinishPosition}
            initialValues={{ time: 0, altitude: 500, inclination: 20, eccentricity: 0.01 }}
          >
            <Form.Item label="Time (seconds since epoch)" name="time" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Altitude (km)" name="altitude" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="Inclination (degrees)" name="inclination" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={180} />
            </Form.Item>
            <Form.Item label="Eccentricity" name="eccentricity" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={0.99} step={0.01} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Compute position
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {error && (
          <Alert
            style={{ marginTop: 24 }}
            type="error"
            showIcon
            message="Request failed"
            description={error}
          />
        )}

        {result && (
          <Card style={{ marginTop: 24 }} title="Result">
            <Descriptions
              column={1}
              bordered
              size="small"
              labelStyle={{ textAlign: 'center' }}
              contentStyle={{ textAlign: 'center' }}
            >
              <Descriptions.Item label="x (km)">{result.x.toFixed(3)}</Descriptions.Item>
              <Descriptions.Item label="y (km)">{result.y.toFixed(3)}</Descriptions.Item>
              <Descriptions.Item label="z (km)">{result.z.toFixed(3)}</Descriptions.Item>
              <Descriptions.Item label="Orbital period (s)">
                {result.period.toFixed(1)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Title level={2} style={{ marginTop: 48 }}>
          Ground Station Contact Windows
        </Title>
        <Paragraph type="secondary">
          Uses the orbit from the form above to find every window, over the next 24 hours, during
          which the spacecraft is above the station's horizon.
        </Paragraph>

        <Card>
          <Form
            form={groundForm}
            layout="vertical"
            onFinish={onFinishGroundStation}
            initialValues={{ longitude: 0, latitude: 0, stationAltitude: 0 }}
          >
            <Form.Item label="Longitude (degrees)" name="longitude" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={-180} max={180} />
            </Form.Item>
            <Form.Item label="Latitude (degrees)" name="latitude" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={-90} max={90} />
            </Form.Item>
            <Form.Item label="Station altitude (km)" name="stationAltitude" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={windowsLoading}>
                Find contact windows
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {windowsError && (
          <Alert
            style={{ marginTop: 24 }}
            type="error"
            showIcon
            message="Request failed"
            description={windowsError}
          />
        )}

        {windows && (
          <Card style={{ marginTop: 24 }} title={`Contact windows (${windows.length})`}>
            <Table
              size="small"
              pagination={false}
              rowKey={(_, index) => index}
              dataSource={windows}
              columns={[
                { title: 'Start (s)', dataIndex: 'start', align: 'center' },
                { title: 'End (s)', dataIndex: 'end', align: 'center' },
                {
                  title: 'Duration (s)',
                  align: 'center',
                  render: (_, record) => record.end - record.start,
                },
              ]}
            />
          </Card>
        )}
        <Title level={2} style={{ marginTop: 48 }}>
          Orbit Visualization
        </Title>
        <Paragraph type="secondary">
          Renders the computed orbit track and ground station on a 3D globe, using the same physics as
          the forms above.
        </Paragraph>

        <Card>
          <OrbitGlobe track={track} period={period} station={stationPos} />
        </Card>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Spacecraft Simulator — Python/FastAPI backend, React/Ant Design frontend
        </Text>
      </Footer>
    </Layout>
  )
}

export default App
