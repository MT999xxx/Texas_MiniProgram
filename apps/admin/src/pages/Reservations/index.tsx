import { useState, useEffect } from 'react';
import { Table, Card, Space, Button, Tag, message, Modal, Select, Input } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { reservationApi, Reservation } from '../../api/reservations';
import './Reservations.css';

const { Search } = Input;

export default function Reservations() {
    const [loading, setLoading] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [searchText, setSearchText] = useState('');

    // 加载预约列表
    const loadReservations = async () => {
        setLoading(true);
        try {
            // TODO: 实际对接API
            // const data = await reservationApi.list({ status: statusFilter });
            // setReservations(data);

            // 模拟数据
            const mockData: Reservation[] = [
                { id: '1', reservedAt: '2023-11-25T19:00:00', member: { nickname: 'Husk·Aiden', phone: '13800138000' }, table: { name: '主赛桌 A1', category: 'MAIN' }, depositAmount: 200, depositPaid: true, status: 'CONFIRMED' },
                { id: '2', reservedAt: '2023-11-25T20:30:00', member: { nickname: 'Husk·Yuri', phone: '13900139000' }, table: { name: '副赛桌 B2', category: 'SIDE' }, depositAmount: 100, depositPaid: false, status: 'PENDING' },
                { id: '3', reservedAt: '2023-11-26T18:00:00', member: { nickname: 'Tom', phone: '13700137000' }, table: { name: '练习桌 C1', category: 'TRAINING' }, depositAmount: 0, depositPaid: false, status: 'CANCELLED' },
            ];
            setReservations(mockData);
        } catch (error) {
            console.error('加载预约列表失败:', error);
            message.error('加载预约列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReservations();
    }, [statusFilter]);

    //确认预约
    const handleConfirm = async (id: string) => {
        try {
            // await reservationApi.updateStatus(id, 'CONFIRMED');
            message.success('已确认预约');
            loadReservations();
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 取消预约
    const handleCancel = async (id: string) => {
        Modal.confirm({
            title: '确认取消预约',
            content: '是否确认取消此预约？',
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    // await reservationApi.cancel(id);
                    message.success('已取消预约');
                    loadReservations();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    // 状态标签
    const getStatusTag = (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
            PENDING: { color: 'orange', text: '待确认' },
            CONFIRMED: { color: 'green', text: '已确认' },
            CANCELLED: { color: 'red', text: '已取消' },
            COMPLETED: { color: 'default', text: '已完成' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    // 表格列定义
    const columns: ColumnsType<Reservation> = [
        {
            title: '预约时间',
            dataIndex: 'reservedAt',
            key: 'reservedAt',
            render: (date: string) => <span className="text-gold">{new Date(date).toLocaleString('zh-CN')}</span>,
        },
        {
            title: '客户信息',
            key: 'member',
            render: (record: Reservation) => (
                <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{record.member?.nickname || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.member?.phone || '-'}</div>
                </div>
            ),
        },
        {
            title: '桌位',
            key: 'table',
            render: (record: Reservation) => (
                <div>
                    <div style={{ color: 'var(--color-gold-primary)' }}>{record.table?.name || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.table?.category || '-'}</div>
                </div>
            ),
        },
        {
            title: '订金',
            key: 'deposit',
            render: (record: Reservation) => {
                if (!record.depositAmount) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
                return (
                    <div>
                        <div style={{ fontFamily: 'DIN Alternate', fontWeight: 'bold' }}>¥{record.depositAmount}</div>
                        <div style={{ fontSize: 12 }}>
                            {record.depositPaid ? (
                                <Tag color="green">已支付</Tag>
                            ) : (
                                <Tag color="orange">未支付</Tag>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: getStatusTag,
        },
        {
            title: '操作',
            key: 'action',
            render: (record: Reservation) => (
                <Space>
                    {record.status === 'PENDING' && (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => handleConfirm(record.id)}
                            >
                                确认
                            </Button>
                            <Button
                                className="btn-danger-ghost"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => handleCancel(record.id)}
                                style={{ background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f' }}
                            >
                                取消
                            </Button>
                        </>
                    )}
                    {record.status === 'CONFIRMED' && (
                        <Button
                            className="btn-danger-ghost"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => handleCancel(record.id)}
                            style={{ background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f' }}
                        >
                            取消
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // 筛选后的数据
    const filteredData = reservations.filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return (
            item.member?.nickname?.toLowerCase().includes(text) ||
            item.member?.phone?.includes(text) ||
            item.table?.name?.toLowerCase().includes(text)
        );
    });

    return (
        <div className="reservations-page">
            <div className="panel-header">
                <div>
                    <h2>预约管理</h2>
                    <p>管理所有赛桌预约记录</p>
                </div>
                <Button type="primary" icon={<ReloadOutlined />} onClick={loadReservations}>
                    刷新列表
                </Button>
            </div>

            <Card bordered={false}>
                <div className="toolbar">
                    <Space size="middle">
                        <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                            popupClassName="dropdown-dark"
                        >
                            <Select.Option value="PENDING">待确认</Select.Option>
                            <Select.Option value="CONFIRMED">已确认</Select.Option>
                            <Select.Option value="CANCELLED">已取消</Select.Option>
                            <Select.Option value="COMPLETED">已完成</Select.Option>
                        </Select>

                        <Search
                            placeholder="搜索客户/手机号/桌位"
                            allowClear
                            style={{ width: 300 }}
                            onSearch={setSearchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Space>
                </div>

                <Table
                    loading={loading}
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                    }}
                />
            </Card>
        </div>
    );
}
