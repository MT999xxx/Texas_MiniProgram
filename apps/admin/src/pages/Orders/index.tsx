import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Select } from 'antd';
import { ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { orderApi, Order } from '../../api/orders';
import './Orders.css';

export default function Orders() {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>();

    useEffect(() => {
        loadOrders();
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

    const handleUpdateStatus = async (id: string, status: string) => {
        Modal.confirm({
            title: '确认更新状态',
            content: `是否将订单状态更新为：${getStatusText(status)}？`,
            onOk: async () => {
                try {
                    await orderApi.updateStatus(id, status);
                    message.success('状态更新成功');
                    loadOrders();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            PENDING: '待支付',
            PAID: '已支付',
            COMPLETED: '已完成',
            CANCELLED: '已取消',
        };
        return map[status] || status;
    };

    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            PENDING: 'orange',
            PAID: 'blue',
            COMPLETED: 'green',
            CANCELLED: 'red',
        };
        return map[status] || 'default';
    };

    const columns: ColumnsType<Order> = [
        {
            title: '订单时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        },
        {
            title: '客户信息',
            key: 'member',
            render: (record: Order) => (
                <div>
                    <div>{record.member?.nickname || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                        {record.member?.phone || '-'}
                    </div>
                </div>
            ),
        },
        {
            title: '桌位',
            key: 'table',
            render: (record: Order) => record.table?.name || '-',
        },
        {
            title: '菜品数',
            key: 'items',
            render: (record: Order) => `${record.items?.length || 0} 项`,
        },
        {
            title: '总金额',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number) => (
                <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                    ¥{amount?.toFixed(2) || '0.00'}
                </span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (record: Order) => (
                <Space>
                    {record.status === 'PAID' && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleUpdateStatus(record.id, 'COMPLETED')}
                        >
                            完成
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="orders-page">
            <Card>
                <div className="toolbar">
                    <Space>
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
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={loadOrders}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Table
                    loading={loading}
                    dataSource={orders}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 个订单`,
                    }}
                />
            </Card>
        </div>
    );
}
