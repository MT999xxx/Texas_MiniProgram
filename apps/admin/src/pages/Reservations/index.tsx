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
            const data = await reservationApi.list({ status: statusFilter });
            setReservations(data);
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
            await reservationApi.updateStatus(id, 'CONFIRMED');
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
            onOk: async () => {
                try {
                    await reservationApi.cancel(id);
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
            render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        },
        {
            title: '客户信息',
            key: 'member',
            render: (record: Reservation) => (
                <div>
                    <div>{record.member?.nickname || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{record.member?.phone || '-'}</div>
                </div>
            ),
        },
        {
            title: '桌位',
            key: 'table',
            render: (record: Reservation) => (
                <div>
                    <div>{record.table?.name || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{record.table?.category || '-'}</div>
                </div>
            ),
        },
        {
            title: '订金',
            key: 'deposit',
            render: (record: Reservation) => {
                if (!record.depositAmount) return '-';
                return (
                    <div>
                        <div>¥{record.depositAmount}</div>
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
                                danger
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => handleCancel(record.id)}
                            >
                                取消
                            </Button>
                        </>
                    )}
                    {record.status === 'CONFIRMED' && (
                        <Button
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => handleCancel(record.id)}
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
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
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

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadReservations}
                        >
                            刷新
                        </Button>
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
