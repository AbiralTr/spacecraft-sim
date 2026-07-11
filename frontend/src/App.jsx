import { useState, useEffect } from 'react'
import { Layout, Row, Col, Card, Typography } from 'antd'
import OrbitGlobe from './OrbitGlobe'
import CreateSpacecraftCard from './CreateSpacecraftCard'
import SpacecraftDetailCard from './SpacecraftDetailCard'
import GroundStationsCard from './GroundStationsCard'

const { Header, Content, Footer } = Layout
const { Title } = Typography

// In dev, Vite (5173) and FastAPI (8000) run as separate origins.
// In production, FastAPI serves this app itself, so requests are same-origin.
const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

function App() {
  const [spacecraftList, setSpacecraftList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [stations, setStations] = useState([])
  const [track, setTrack] = useState(null)
  const [period, setPeriod] = useState(null)
  const [contactWindows, setContactWindows] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/spacecraft`)
      .then((res) => res.json())
      .then((list) => {
        setSpacecraftList(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
    fetch(`${API_BASE}/api/ground-stations`)
      .then((res) => res.json())
      .then(setStations)
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setTrack(null)
      setPeriod(null)
      setContactWindows(null)
      return
    }
    fetch(`${API_BASE}/api/spacecraft/${selectedId}/orbit-track`)
      .then((res) => res.json())
      .then((data) => {
        setTrack(data.track)
        setPeriod(data.period)
      })
    fetch(`${API_BASE}/api/spacecraft/${selectedId}/contact-windows`)
      .then((res) => res.json())
      .then(setContactWindows)
  }, [selectedId])

  const handleCreated = (created) => {
    setSpacecraftList((list) => [...list, created])
    setSelectedId(created.id)
  }

  const handleUpdated = (updated) => {
    setSpacecraftList((list) => list.map((s) => (s.id === updated.id ? updated : s)))
  }

  const handleDeleted = (deletedId) => {
    setSpacecraftList((list) => {
      const remaining = list.filter((s) => s.id !== deletedId)
      setSelectedId(remaining.length > 0 ? remaining[0].id : null)
      return remaining
    })
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

      <Content style={{ maxWidth: 1400, margin: '32px auto', padding: '0 24px', width: '100%' }}>
        <Row gutter={[24, 24]} align="stretch">
          <Col xs={24} lg={6}>
            <CreateSpacecraftCard apiBase={API_BASE} onCreated={handleCreated} />
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Orbit Visualization" style={{ height: '100%' }} styles={{ body: { padding: 0 } }}>
              <OrbitGlobe track={track} period={period} stations={stations} />
            </Card>
          </Col>

          <Col xs={24} lg={6}>
            <SpacecraftDetailCard
              apiBase={API_BASE}
              spacecraftList={spacecraftList}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          </Col>
        </Row>

        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <GroundStationsCard stations={stations} contactWindows={contactWindows} />
          </Col>
        </Row>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        Spacecraft Simulator — Python/FastAPI backend, React/Ant Design frontend
      </Footer>
    </Layout>
  )
}

export default App
