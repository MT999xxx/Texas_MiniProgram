import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  memberApi,
  MembershipRewardGrant,
  MembershipRewardStatus,
  UpdateMembershipRewardPayload,
} from '../../api/members';
import './MembershipRewards.css';

const statusMeta: Record<MembershipRewardStatus, { text: string; color: string }> = {
  PENDING: { text: '待发放', color: 'gold' },
  ISSUED: { text: '已发放', color: 'green' },
  CANCELLED: { text: '已取消', color: 'default' },
};

export default function MembershipRewards() {
  const { message } = App.useApp();
  const [form] = Form.useForm<UpdateMembershipRewardPayload>();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<MembershipRewardGrant[]>([]);
  const [status, setStatus] = useState<'ALL' | MembershipRewardStatus>('PENDING');
  const [editing, setEditing] = useState<MembershipRewardGrant | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      setRecords(await memberApi.listRewards(status === 'ALL' ? undefined : status));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载等级奖励失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status]);

  const summary = useMemo(() => ({
    count: records.length,
    points: records.reduce((sum, item) => sum + Number(item.points || 0), 0),
    coins: records.reduce((sum, item) => sum + Number(item.coins || 0), 0),
    vouchers: records.reduce((sum, item) => sum + Number(item.wineVouchers || 0), 0),
    tickets: records.reduce((sum, item) => sum + Number(item.monthlyTickets || 0), 0),
  }), [records]);

  const openEdit = (record: MembershipRewardGrant) => {
    setEditing(record);
    form.setFieldsValue({
      points: Number(record.points || 0),
      coins: Number(record.coins || 0),
      wineVouchers: Number(record.wineVouchers || 0),
      monthlyTickets: Number(record.monthlyTickets || 0),
      remark: record.remark,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await memberApi.updateReward(editing.id, values);
      message.success('奖励数量已更新');
      setEditing(null);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const issueReward = async (record: MembershipRewardGrant) => {
    try {
      await memberApi.issueReward(record.id);
      message.success(`${record.member?.nickname || '会员'}的${record.levelCode}奖励已发放`);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '奖励发放失败');
    }
  };

  const columns: ColumnsType<MembershipRewardGrant> = [
    {
      title: '会员',
      key: 'member',
      width: 150,
      render: (_, record) => (
        <div>
          <strong>{record.member?.nickname || '未命名会员'}</strong>
          <div className="reward-secondary">{record.member?.phone || '未绑定手机'}</div>
        </div>
      ),
    },
    {
      title: '升级等级',
      key: 'level',
      width: 150,
      render: (_, record) => <Tag color="gold">{record.levelCode} {record.levelName}</Tag>,
    },
    {
      title: '累计充值门槛',
      dataIndex: 'threshold',
      width: 130,
      render: (value: number) => `¥${Number(value || 0).toLocaleString('zh-CN')}`,
    },
    {
      title: '积分',
      dataIndex: 'points',
      width: 100,
      render: (value: number) => Number(value || 0).toLocaleString('zh-CN'),
    },
    {
      title: '金币',
      dataIndex: 'coins',
      width: 90,
      render: (value: number) => Number(value || 0),
    },
    {
      title: '酒券',
      dataIndex: 'wineVouchers',
      width: 80,
      render: (value: number) => `${Number(value || 0)}张`,
    },
    {
      title: '月赛门票',
      dataIndex: 'monthlyTickets',
      width: 100,
      render: (value: number) => `${Number(value || 0)}张`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: MembershipRewardStatus) => <Tag color={statusMeta[value].color}>{statusMeta[value].text}</Tag>,
    },
    {
      title: '触发时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false }),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => record.status === 'PENDING' ? (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm
            title="确认发放该等级奖励？"
            description="确认后积分、金币、酒券和月赛门票会立即进入会员账户，不能重复发放。"
            okText="确认发放"
            cancelText="取消"
            onConfirm={() => issueReward(record)}
          >
            <Button size="small" type="primary" icon={<CheckOutlined />}>确认发放</Button>
          </Popconfirm>
        </Space>
      ) : <span className="reward-secondary">{record.issuedAt ? new Date(record.issuedAt).toLocaleString('zh-CN', { hour12: false }) : '-'}</span>,
    },
  ];

  return (
    <div className="membership-rewards-page">
      <div className="reward-page-header">
        <div>
          <h2>等级奖励</h2>
          <p>会员达到累计充值门槛后生成待发奖励，确认前可调整实际发放数量。</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      </div>

      <Row gutter={[16, 16]} className="reward-summary">
        <Col xs={12} md={5}><Card><Statistic title="记录" value={summary.count} suffix="条" /></Card></Col>
        <Col xs={12} md={5}><Card><Statistic title="积分" value={summary.points} /></Card></Col>
        <Col xs={12} md={5}><Card><Statistic title="金币" value={summary.coins} /></Card></Col>
        <Col xs={12} md={5}><Card><Statistic title="酒券" value={summary.vouchers} suffix="张" /></Card></Col>
        <Col xs={12} md={4}><Card><Statistic title="月赛门票" value={summary.tickets} suffix="张" /></Card></Col>
      </Row>

      <Card>
        <Segmented
          value={status}
          onChange={(value) => setStatus(value as typeof status)}
          options={[
            { label: '待发放', value: 'PENDING' },
            { label: '已发放', value: 'ISSUED' },
            { label: '全部', value: 'ALL' },
          ]}
          className="reward-filter"
        />
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={records}
          scroll={{ x: 1250 }}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条记录` }}
        />
      </Card>

      <Modal
        title={`编辑 ${editing?.levelCode || ''} 等级奖励`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="points" label="积分" rules={[{ required: true }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="coins" label="金币" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="wineVouchers" label="酒券（张）" rules={[{ required: true }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="monthlyTickets" label="月赛门票（张）" rules={[{ required: true }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} maxLength={255} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
