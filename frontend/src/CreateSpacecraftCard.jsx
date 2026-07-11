import { useState } from 'react'
import { Card, Form, Input, InputNumber, Button, Alert } from 'antd'

function CreateSpacecraftCard({ apiBase, onCreated }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onFinish = async (values) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/spacecraft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ? JSON.stringify(body.detail) : `Backend returned ${res.status}`)
      }
      const created = await res.json()
      form.resetFields()
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Create Spacecraft" style={{ height: '100%' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ altitude: 500, inclination: 20, eccentricity: 0.01 }}
      >
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
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Launch
          </Button>
        </Form.Item>
      </Form>
      {error && (
        <Alert style={{ marginTop: 16 }} type="error" showIcon message="Create failed" description={error} />
      )}
    </Card>
  )
}

export default CreateSpacecraftCard
