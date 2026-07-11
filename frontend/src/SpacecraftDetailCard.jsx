import { useEffect, useState } from 'react'
import { Card, Select, Form, Input, InputNumber, Button, Space, Empty, Alert, Popconfirm } from 'antd'

function SpacecraftDetailCard({ apiBase, spacecraftList, selectedId, onSelect, onUpdated, onDeleted }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selected = spacecraftList.find((s) => s.id === selectedId) ?? null

  useEffect(() => {
    if (selected) form.setFieldsValue(selected)
  }, [selected?.id])

  const onFinish = async (values) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/spacecraft/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      onUpdated(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    const res = await fetch(`${apiBase}/api/spacecraft/${selectedId}`, { method: 'DELETE' })
    if (res.ok) onDeleted(selectedId)
  }

  return (
    <Card title="Selected Spacecraft" style={{ height: '100%' }}>
      <Select
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="Select a spacecraft"
        value={selectedId ?? undefined}
        onChange={onSelect}
        options={spacecraftList.map((s) => ({ value: s.id, label: s.name }))}
      />

      {!selected && <Empty description="No spacecraft selected" />}

      {selected && (
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={selected}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item label="Altitude (km)" name="altitude" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="Inclination (degrees)" name="inclination" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={180} />
          </Form.Item>
          <Form.Item label="Eccentricity" name="eccentricity" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={0.99} step={0.01} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save
            </Button>
            <Popconfirm
              title="Delete this spacecraft?"
              onConfirm={onDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button danger>Delete</Button>
            </Popconfirm>
          </Space>
        </Form>
      )}

      {error && <Alert style={{ marginTop: 16 }} type="error" showIcon message="Save failed" description={error} />}
    </Card>
  )
}

export default SpacecraftDetailCard
