import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Select, Input, Drawer, Timeline, Descriptions, Form, Row, Col, Statistic, App } from 'antd';
import { ReloadOutlined, CheckOutlined, EyeOutlined, RollbackOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { orderApi, Order } from '../../api/orders';
import './Orders.css';

const { Search } = Input;

export default function Orders() {
    const { message, modal } = App.useApp();
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
            const data = await orderApi.list({ status: statusFilter });
            setOrders(data);
        } catch (error) {
            message.error('加载订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await orderApi.getStats();
            setStats(data);
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    };

    const handleViewDetail = (order: Order) => {
        setSelectedOrder(order);
        setDrawerVisible(true);
    };

    const handleComplete = async (order: Order) => {
        modal.confirm({
            title: '确认完成订单',
            content: `确定将订单 ${order.orderNumber || order.orderNo} 标记为已完成吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await orderApi.updateStatus(order.id, 'COMPLETED');
                    message.success('订单已完成');
                    loadOrders();
                    loadStats();
                } catch (error) {
                    message.error('操作失败');
                }
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
            await orderApi.refund(selectedOrder!.id, values);
            message.success('退款申请已提交');
            setRefundModalVisible(false);
            loadOrders();
            loadStats();
        } catch (error) {
            console.error('退款失败:', error);
            message.error('提交退款失败');
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

    /** 根据后端 paymentMethod 字段或订单状态推断支付方式文本 */
    const getPaymentMethodText = (order: Order) => {
        if (order.paymentMethod) {
            const map: Record<string, string> = {
                wechat_pay: '微信支付',
                coins: '金币支付',
                backend_confirm: '后台确认',
            };
            return map[order.paymentMethod] || order.paymentMethod;
        }
        if (order.status === 'PENDING' || order.status === 'CANCELLED') return '未支付';
        return '后台确认';
    };

    // 筛选后的数据
    const filteredOrders = orders.filter((order) => {
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        const orderNo = (order.orderNumber || order.orderNo || '').toLowerCase();
        return (
            orderNo.includes(text) ||
            order.member?.nickname?.toLowerCase().includes(text) ||
            order.member?.phone?.includes(text)
        );
    });

    const columns: ColumnsType<Order> = [
        {
            title: '订单号',
            key: 'orderNo',
            width: 80,
            render: (_: any, __: Order, index: number) => (
                <span style={{ fontFamily: 'monospace', color: 'var(--color-gold-primary)', fontWeight: 'bold' }}>{index + 1}</span>
            ),
        },
        {
            title: '客户信息',
            key: 'member',
            render: (record: Order) => {
                const avatarUrl = record.member?.avatar;
                // 只有 https:// 开头的 URL 才是有效的（排除 http://tmp/ 等临时文件）
                const isValidUrl = avatarUrl && avatarUrl.startsWith('https://');

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isValidUrl ? (
                            <img
                                src={avatarUrl}
                                alt={record.member?.nickname}
                                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#8b0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                                {record.member?.nickname?.charAt(0) || '?'}
                            </div>
                        )}
                        <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{record.member?.nickname || '-'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.member?.phone || '-'}</div>
                        </div>
                    </div>
                );
            },
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
            render: (amount: number | string) => (
                <span style={{ fontFamily: 'DIN Alternate', fontWeight: 'bold', color: 'var(--color-gold-primary)', fontSize: 16 }}>
                    ¥{Number(amount).toFixed(2)}
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
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleComplete(record)}>
                            完成
                        </Button>
                    )}
                    {(record.status === 'PAID' || record.status === 'COMPLETED' || record.status === 'CANCELLED') && (
                        <Button size="small" danger icon={<RollbackOutlined />} onClick={() => handleRefund(record)}>
                            退款
                        </Button>
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
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => { loadOrders(); loadStats(); }}>
                    刷新列表
                </Button>
            </div>

            {/* 统计卡片 */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="订单数量" value={stats.totalOrders} suffix="单" valueStyle={{ color: 'var(--color-gold-primary)' }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic title="总营收" value={stats.totalAmount} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
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

            <Card variant="borderless">
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
                title={`订单详情 - ${selectedOrder?.orderNumber || selectedOrder?.orderNo || ''}`}
                placement="right"
                width={500}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            >
                {selectedOrder && (
                    <div className="order-detail">
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="订单号">{selectedOrder.orderNumber || selectedOrder.orderNo}</Descriptions.Item>
                            <Descriptions.Item label="客户">{selectedOrder.member?.nickname}</Descriptions.Item>
                            <Descriptions.Item label="手机号">{selectedOrder.member?.phone}</Descriptions.Item>
                            <Descriptions.Item label="桌位">{selectedOrder.table?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="订单金额">
                                <span style={{ color: 'var(--color-gold-primary)', fontWeight: 'bold' }}>
                                    ¥{Number(selectedOrder.totalAmount).toFixed(2)}
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="支付方式">{getPaymentMethodText(selectedOrder)}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={getStatusColor(selectedOrder.status)}>{getStatusText(selectedOrder.status)}</Tag>
                            </Descriptions.Item>
                            {(selectedOrder.remark || selectedOrder.notes) && (
                                <Descriptions.Item label="备注">{selectedOrder.remark || selectedOrder.notes}</Descriptions.Item>
                            )}
                        </Descriptions>

                        <h4 style={{ marginTop: 24, marginBottom: 12 }}>菜品明细</h4>
                        <Table
                            dataSource={selectedOrder.items}
                            columns={[
                                { title: '菜品', dataIndex: ['menuItem', 'name'], key: 'name' },
                                {
                                    title: '单价', key: 'unitPrice',
                                    render: (_: any, item: any) => {
                                        const up = item.unitPrice ?? item.menuItem?.price ?? (item.quantity > 0 ? Number(item.amount) / item.quantity : null);
                                        return up != null ? `¥${Number(up).toFixed(2)}` : '-';
                                    },
                                },
                                {
                                    title: '数量', key: 'quantity',
                                    render: (_: any, item: any) => {
                                        const spec = item.specType;
                                        const qty = item.quantity || 1;
                                        if (spec === 'dozen') return `${qty}打 (${qty * 12}瓶)`;
                                        if (spec === 'half_dozen') return `${qty}组 (${qty * 6}瓶)`;
                                        // 旧订单无 specType：用总价/单价推断实际数量
                                        if (!spec && item.menuItem?.halfDozenPrice && Number(item.amount) === Number(item.menuItem.halfDozenPrice) * qty) {
                                            return `${qty}组 (${qty * 6}瓶)`;
                                        }
                                        if (!spec && item.menuItem?.dozenPrice && Number(item.amount) === Number(item.menuItem.dozenPrice) * qty) {
                                            return `${qty}打 (${qty * 12}瓶)`;
                                        }
                                        return `${qty}`;
                                    },
                                },
                                { title: '小计', dataIndex: 'amount', key: 'amount', render: (v: any) => v != null ? `¥${Number(v).toFixed(2)}` : '-' },
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
                )
                }
            </Drawer >

            {/* 退款弹窗 */}
            < Modal
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
                        <Input value={selectedOrder?.orderNumber || selectedOrder?.orderNo} disabled />
                    </Form.Item>
                    <Form.Item name="amount" label="退款金额" rules={[{ required: true, message: '请输入退款金额' }]}>
                        <Input prefix="¥" type="number" />
                    </Form.Item>
                    <Form.Item name="reason" label="退款原因" rules={[{ required: true, message: '请输入退款原因' }]}>
                        <Input.TextArea rows={3} placeholder="请输入退款原因" />
                    </Form.Item>
                </Form>
            </Modal >
        </div >
    );
}
