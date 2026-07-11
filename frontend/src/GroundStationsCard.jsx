import { Card, Table, Typography } from 'antd'

const { Text } = Typography

function formatWindow(w) {
  return `${w.start}s–${w.end}s`
}

function GroundStationsCard({ stations, contactWindows }) {
  const windowsByStation = new Map((contactWindows ?? []).map((entry) => [entry.station_id, entry.windows]))

  const columns = [
    { title: 'Station', dataIndex: 'name' },
    { title: 'Longitude', dataIndex: 'longitude', align: 'center', width: 110 },
    { title: 'Latitude', dataIndex: 'latitude', align: 'center', width: 110 },
    {
      title: 'Contact windows (next 24h)',
      align: 'center',
      render: (_, station) => {
        const windows = windowsByStation.get(station.id)
        if (!windows) return <Text type="secondary">select a spacecraft</Text>
        if (windows.length === 0) return <Text type="secondary">none</Text>
        return `${windows.length} window${windows.length > 1 ? 's' : ''}, next ${formatWindow(windows[0])}`
      },
    },
  ]

  return (
    <Card title="Ground Stations">
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={stations}
        columns={columns}
        scroll={{ y: 320 }}
      />
    </Card>
  )
}

export default GroundStationsCard
