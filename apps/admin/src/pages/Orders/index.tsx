import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Select, Input, Drawer, Timeline, Descriptions, Form, Row, Col, Statistic } from 'antd';
import { ReloadOutlined, CheckOutlined, EyeOutlined, RollbackOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { orderApi, Order, OrderItem } from '../../api/orders';
import './Orders.css';

const { confirm } = Modal;
const { Search } = Input;

export default function Orders() {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>();
    const [searchText, setSearchText] = useState('');

    // 详情抽屉
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // 退款弹窗
    const [refundModalVisible, setRefundModalVisible] = useState(false);
    const [refundForm] = Form.useForm();

    // 统计数据
    const [stats, setStats] = useState({ totalOrders: 0, totalAmount: 0, completedOrders: 0, averageAmount: 0 });

    useEffect(() => {
        loadOrders();
        loadStats();
    }, [statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            // 模拟数据
            const mockOrders: Order[] = [
                {
                    id: '1', orderNo: 'ORD20231204001',
                    member: { id: '1', nickname: 'Husk·Aiden', phone: '13800138000' },
                    table: { id: '1', name: '主赛桌 A1' },
                    items: [
                        { id: '1', menuItem: { id: '1', name: '火焰威士忌塔', price: 188 }, quantity: 2, price: 188, subtotal: 376 },
                        { id: '2', menuItem: { id: '2', name: '冠军定制套餐', price: 268 }, quantity: 1, price: 268, subtotal: 268 },
                    ],
                    totalAmount: 644, status: 'PAID', paymentMethod: 'WECHAT', paidAt: '2023-12-04T19:30:00',
                    createdAt: '2023-12-04T19:25:00', updatedAt: '2023-12-04T19:30:00'
                },
                {
                    id: '2', orderNo: 'ORD20231204002',
                    member: { id: '2', nickname: 'Husk·Yuri', phone: '13900139000' },
                    table: { id: '2', name: '副赛桌 B1' },
                    items: [
                        { id: '3', menuItem: { id: '3', name: '午夜能量Shot', price: 58 }, quantity: 3, price: 58, subtotal: 174 },
                    ],
                    totalAmount: 174, status: 'COMPLETED', paymentMethod: 'ALIPAY', paidAt: '2023-12-04T18:00:00',
                    createdAt: '2023-12-04T17:55:00', updatedAt: '2023-12-04T20:00:00'
                },
                {
                    id: '3', orderNo: 'ORD20231204003',
                    member: { id: '3', nickname: 'Tom', phone: '13700137000' },
                    items: [],
                    totalAmount: 326, status: 'PENDING',
                    createdAt: '2023-12-04T20:00:00', updatedAt: '2023-12-04T20:00:00'
                },
                {
                    id: '4', orderNo: 'ORD20231203001',
                    member: { id: '4', nickname: 'Jerry', phone: '13600136000' },
                    table: { id: '3', name: '练习桌 C1' },
                    items: [
                        { id: '4', menuItem: { id: '4', name: '皇家精酿', price: 68 }, quantity: 4, price: 68, subtotal: 272 },
                    ],
                    totalAmount: 272, status: 'REFUNDED', remark: '客户要求退款',
                    createdAt: '2023-12-03T21:00:00', updatedAt: '2023-12-03T22:00:00'
                },
            ];
            setOrders(mockOrders);
        } catch (error) {
            message.error('加载订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        // 模拟数据
        setStats({
            totalOrders: 128,
            totalAmount: 82430,
            completedOrders: 96,
            averageAmount: 644,
        });
    };

    const handleViewDetail = (order: Order) => {
        setSelectedOrder(order);
        setDrawerVisible(true);
    };

    const handleComplete = async (order: Order) => {
        confirm({
            title: '确认完成订单',
            content: `确定将订单 ${order.orderNo} 标记为已完成吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                // await orderApi.updateStatus(order.id, 'COMPLETED');
                message.success('订单已完成');
                loadOrders();
            },
        });
    };

    const handleRefund = (order: Order) => {
        setSelectedOrder(order);
        refundForm.resetFields();
        refundForm.setFieldsValue({ amount: order.totalAmount });
        setRefundModalVisible(true);
    };

    const handleRefundSubmit = async () => {
        try {
            const values = await refundForm.validateFields();
            // await orderApi.refund(selectedOrder!.id, values);
            message.success('退款申请已提交');
            setRefundModalVisible(false);
            loadOrders();
        } catch (error) {
            console.error('退款失败:', error);
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            PENDING: '待支付',
            PAID: '已支付',
            COMPLETED: '已完成',
            CANCELLED: '已取消',
            REFUNDED: '已退款',
        };
        return map[status] || status;
    };

    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            PENDING: 'orange',
            PAID: 'blue',
            COMPLETED: 'green',
            CANCELLED: 'default',
            REFUNDED: 'red',
        };
        return map[status] || 'default';
    };

    const getPaymentMethodText = (method?: string) => {
        const map: Record<string, string> = {
            WECHAT: '微信支付',
            ALIPAY: '支付宝',
            CASH: '现金',
            CARD: '刷卡',
        };
        return method ? (map[method] || method) : '-';
    };

    // 筛选后的数据
    const filteredOrders = orders.filter((order) => {
        if (statusFilter && order.status !== statusFilter) return false;
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return (
            order.orderNo.toLowerCase().includes(text) ||
            order.member?.nickname?.toLowerCase().includes(text) ||
            order.member?.phone?.includes(text)
        );
    });

    const columns: ColumnsType<Order> = [
        {
            title: '订单号',
            dataIndex: 'orderNo',
            key: 'orderNo',
            render: (orderNo: string) => (
                <span style={{ fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>{orderNo}</span>
            ),
        },
        {
            title: '客户信息',
            key: 'member',
            render: (record: Order) => (
                <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{record.member?.nickname || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.member?.phone || '-'}</div>
                </div>
            ),
        },
        {
            title: '桌位',
            key: 'table',
            render: (record: Order) => record.table?.name || '-',
        },
        {
            title: '金额',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number) => (
                <span style={{ fontFamily: 'DIN Alternate', fontWeight: 'bold', color: 'var(--color-gold-primary)', fontSize: 16 }}>
                    ¥{amount.toFixed(2)}
                </span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
        },
        {
            title: '下单时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        },
        {
            title: '操作',
            key: 'action',
            render: (record: Order) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
                        详情
                    </Button>
                    {record.status === 'PAID' && (
                        <>
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleComplete(record)}>
                                完成
                            </Button>
                            <Button size="small" danger icon={<RollbackOutlined />} onClick={() => handleRefund(record)}>
                                退款
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="orders-page page-enter">
            <div className="panel-header">
                <div>
                    <h2>订单管理</h2>
                    <p>管理所有订单，查看详情和处理退款</p>
                </div>
                <Button type="primary" icon={<ReloadOutlined />} onClick={loadOrders}>
                    刷新列表
                </Button>
            </div>

            {/* 统计卡片 */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="今日订单" value={stats.totalOrders} suffix="单" valueStyle={{ color: 'var(--color-gold-primary)' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="今日营收" value={stats.totalAmount} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="已完成" value={stats.completedOrders} suffix="单" valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="客单价" value={stats.averageAmount} prefix="¥" precision={0} valueStyle={{ color: 'var(--text-secondary)' }} />
                    </Card>
                </Col>
            </Row>

            <Card bordered={false}>
                <div className="toolbar">
                    <Space size="middle" style={{ flex: 1 }}>
                        <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Select.Option value="PENDING">待支付</Select.Option>
                            <Select.Option value="PAID">已支付</Select.Option>
                            <Select.Option value="COMPLETED">已完成</Select.Option>
                            <Select.Option value="CANCELLED">已取消</Select.Option>
                            <Select.Option value="REFUNDED">已退款</Select.Option>
                        </Select>
                        <Search
                            placeholder="搜索订单号/客户/手机号"
                            allowClear
                            style={{ width: 300 }}
                            onSearch={setSearchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Space>
                </div>

                <Table
                    loading={loading}
                    dataSource={filteredOrders}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 个订单` }}
                />
            </Card>

            {/* 订单详情抽屉 */}
            <Drawer
                title={`订单详情 - ${selectedOrder?.orderNo || ''}`}
                placement="right"
                width={500}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            >
                {selectedOrder && (
                    <div className="order-detail">
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="订单号">{selectedOrder.orderNo}</Descriptions.Item>
                            <Descriptions.Item label="客户">{selectedOrder.member?.nickname}</Descriptions.Item>
                            <Descriptions.Item label="手机号">{selectedOrder.member?.phone}</Descriptions.Item>
                            <Descriptions.Item label="桌位">{selectedOrder.table?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="订单金额">
                                <span style={{ color: 'var(--color-gold-primary)', fontWeight: 'bold' }}>
                                    ¥{selectedOrder.totalAmount.toFixed(2)}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="支付方式">{getPaymentMethodText(selectedOrder.paymentMethod)}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={getStatusColor(selectedOrder.status)}>{getStatusText(selectedOrder.status)}</Tag>
                            </Descriptions.Item>
                            {selectedOrder.remark && (
                                <Descriptions.Item label="备注">{selectedOrder.remark}</Descriptions.Item>
                            )}
                        </Descriptions>

                        <h4 style={{ marginTop: 24, marginBottom: 12 }}>菜品明细</h4>
                        <Table
                            dataSource={selectedOrder.items}
                            columns={[
                                { title: '菜品', dataIndex: ['menuItem', 'name'], key: 'name' },
                                { title: '单价', dataIndex: 'price', key: 'price', render: (v) => `¥${v}` },
                                { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                                { title: '小计', dataIndex: 'subtotal', key: 'subtotal', render: (v) => `¥${v}` },
                            ]}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />

                        <h4 style={{ marginTop: 24, marginBottom: 12 }}>订单时间线</h4>
                        <Timeline
                            items={[
                                { color: 'gray', children: `创建订单 ${new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}` },
                                ...(selectedOrder.paidAt ? [{ color: 'blue', children: `支付成功 ${new Date(selectedOrder.paidAt).toLocaleString('zh-CN')}` }] : []),
                                ...(selectedOrder.status === 'COMPLETED' ? [{ color: 'green', children: `订单完成 ${new Date(selectedOrder.updatedAt).toLocaleString('zh-CN')}` }] : []),
                                ...(selectedOrder.status === 'REFUNDED' ? [{ color: 'red', children: `已退款 ${new Date(selectedOrder.updatedAt).toLocaleString('zh-CN')}` }] : []),
                            ]}
                        />
                    </div>
                )}
            </Drawer>

            {/* 退款弹窗 */}
            <Modal
                title="申请退款"
                open={refundModalVisible}
                onOk={handleRefundSubmit}
                onCancel={() => setRefundModalVisible(false)}
                okText="确认退款"
                okType="danger"
                cancelText="取消"
            >
                <Form form={refundForm} layout="vertical">
                    <Form.Item label="订单号">
                        <Input value={selectedOrder?.orderNo} disabled />
                    </Form.Item>
                    <Form.Item name="amount" label="退款金额" rules={[{ required: true, message: '请输入退款金额' }]}>
                        <Input prefix="¥" type="number" />
                    </Form.Item>
                    <Form.Item name="reason" label="退款原因" rules={[{ required: true, message: '请输入退款原因' }]}>
                        <Input.TextArea rows={3} placeholder="请输入退款原因" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
