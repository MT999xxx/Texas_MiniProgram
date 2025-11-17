import { useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Space, Card, Tag, Button, message, Modal, Form, Input, DatePicker, Select, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { fetchTables } from './api/tables';
import { createReservation } from './api/reservations';
import { Table, TableStatus } from './types';

const statusColor: Record<TableStatus, string> = {
  AVAILABLE: 'green',
  RESERVED: 'gold',
  IN_USE: 'volcano',
  MAINTENANCE: 'red',
};

const { Title, Text } = Typography;

function App() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TableStatus | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [form] = Form.useForm();

  const filteredTables = useMemo(
    () => (filter ? tables.filter((t) => t.status === filter) : tables),
    [tables, filter],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTables(filter);
      setTables(data);
    } catch (err: any) {
      message.error(err.message || '获取桌位失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openReservation = (table: Table) => {
    setCurrentTable(table);
    form.setFieldsValue({ tableId: table.id, reservedAt: dayjs() });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createReservation({
        customerName: values.customerName,
        phone: values.phone,
        tableId: values.tableId,
        reservedAt: values.reservedAt.toISOString(),
        note: values.note,
      });
      message.success('预约成功');
      setOpen(false);
      load();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || '预约失败');
    }
  };

  return (
    <Layout style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center">
          <Title level={3} style={{ margin: 0 }}>
            桌位预约
          </Title>
          <Select
            allowClear
            placeholder="按状态筛选"
            style={{ width: 160 }}
            onChange={(val) => setFilter(val as TableStatus | undefined)}
            options={[
              { label: '可用', value: 'AVAILABLE' },
              { label: '已预定', value: 'RESERVED' },
              { label: '使用中', value: 'IN_USE' },
              { label: '维护中', value: 'MAINTENANCE' },
            ]}
          />
          <Button onClick={load} loading={loading}>
            刷新
          </Button>
        </Space>

        <Row gutter={[16, 16]}>
          {filteredTables.map((table) => (
            <Col key={table.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                title={
                  <Space>
                    <Text strong>{table.name}</Text>
                    <Tag color={statusColor[table.status]}>{table.status}</Tag>
                  </Space>
                }
                extra={<Text>容纳 {table.capacity}</Text>}
                actions={[
                  <Button
                    type="primary"
                    disabled={table.status !== 'AVAILABLE' && table.status !== 'RESERVED'}
                    onClick={() => openReservation(table)}
                  >
                    预约
                  </Button>,
                ]}
              >
                <Text type="secondary">类型: {table.category}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>

      <Modal
        title={currentTable ? `预约 ${currentTable.name}` : '预约'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tableId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="customerName"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[{ required: true, pattern: /^1\d{10}$/, message: '请输入有效手机号' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="reservedAt"
            label="预约时间"
            rules={[{ required: true, message: '请选择时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default App;
