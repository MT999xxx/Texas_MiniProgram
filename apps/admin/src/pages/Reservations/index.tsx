import { useState, useEffect } from 'react';
import { Table, Card, Space, Button, Tag, message, Modal, Select, Input, Checkbox } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { reservationApi, Reservation } from '../../api/reservations';
import './Reservations.css';

const { Search } = Input;
const { confirm } = Modal;

export default function Reservations() {
    const [loading, setLoading] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // 加载预约列表
    const loadReservations = async () => {
        setLoading(true);
        try {
            // 模拟数据
            const mockData: Reservation[] = [
                { id: '1', reservedAt: '2023-12-04T19:00:00', member: { nickname: 'Husk·Aiden', phone: '13800138000' }, table: { name: '主赛桌 A1', category: 'MAIN' }, depositAmount: 200, depositPaid: true, status: 'CONFIRMED' },
                { id: '2', reservedAt: '2023-12-04T20:30:00', member: { nickname: 'Husk·Yuri', phone: '13900139000' }, table: { name: '副赛桌 B2', category: 'SIDE' }, depositAmount: 100, depositPaid: false, status: 'PENDING' },
                { id: '3', reservedAt: '2023-12-05T18:00:00', member: { nickname: 'Tom', phone: '13700137000' }, table: { name: '练习桌 C1', category: 'TRAINING' }, depositAmount: 0, depositPaid: false, status: 'PENDING' },
                { id: '4', reservedAt: '2023-12-05T19:30:00', member: { nickname: 'Jerry', phone: '13600136000' }, table: { name: '主赛桌 A2', category: 'MAIN' }, depositAmount: 200, depositPaid: true, status: 'PENDING' },
                { id: '5', reservedAt: '2023-12-06T20:00:00', member: { nickname: 'Mike', phone: '13500135000' }, table: { name: '副赛桌 B1', category: 'SIDE' }, depositAmount: 100, depositPaid: false, status: 'CANCELLED' },
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

    // 批量确认
    const handleBatchConfirm = () => {
        const pendingIds = selectedRowKeys.filter(id =>
            reservations.find(r => r.id === id)?.status === 'PENDING'
        );

        if (pendingIds.length === 0) {
            message.warning('请选择待确认的预约');
            return;
        }

        confirm({
            title: '批量确认预约',
            icon: <ExclamationCircleOutlined />,
            content: `确定要确认 ${pendingIds.length} 条预约吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                message.success(`已确认 ${pendingIds.length} 条预约`);
                setSelectedRowKeys([]);
                loadReservations();
            },
        });
    };

    // 批量取消
    const handleBatchCancel = () => {
        const cancelableIds = selectedRowKeys.filter(id => {
            const r = reservations.find(r => r.id === id);
            return r?.status === 'PENDING' || r?.status === 'CONFIRMED';
        });

        if (cancelableIds.length === 0) {
            message.warning('请选择可取消的预约');
            return;
        }

        confirm({
            title: '批量取消预约',
            icon: <ExclamationCircleOutlined />,
            content: `确定要取消 ${cancelableIds.length} 条预约吗？此操作不可撤销！`,
            okText: '确认取消',
            okType: 'danger',
            cancelText: '返回',
            onOk: async () => {
                message.success(`已取消 ${cancelableIds.length} 条预约`);
                setSelectedRowKeys([]);
                loadReservations();
            },
        });
    };

    // 导出 Excel
    const handleExport = () => {
        const dataToExport = selectedRowKeys.length > 0
            ? reservations.filter(r => selectedRowKeys.includes(r.id))
            : reservations;

        // 模拟导出
        const csvContent = [
            '预约时间,客户昵称,联系电话,桌位,订金,状态',
            ...dataToExport.map(r =>
                `${r.reservedAt},${r.member?.nickname},${r.member?.phone},${r.table?.name},${r.depositAmount},${r.status}`
            )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `预约记录_${new Date().toLocaleDateString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        message.success(`已导出 ${dataToExport.length} 条记录`);
    };

    //确认预约
    const handleConfirm = async (id: string) => {
        message.success('已确认预约');
        loadReservations();
    };

    // 取消预约
    const handleCancel = async (id: string) => {
        confirm({
            title: '确认取消预约',
            content: '是否确认取消此预约？',
            okText: '确认',
            cancelText: '返回',
            onOk: async () => {
                message.success('已取消预约');
                loadReservations();
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

    // 行选择配置
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    };

    const hasSelected = selectedRowKeys.length > 0;

    return (
        <div className="reservations-page page-enter">
            <div className="panel-header">
                <div>
                    <h2>预约管理</h2>
                    <p>管理所有赛桌预约记录</p>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>
                        {hasSelected ? `导出选中 (${selectedRowKeys.length})` : '导出全部'}
                    </Button>
                    <Button type="primary" icon={<ReloadOutlined />} onClick={loadReservations}>
                        刷新列表
                    </Button>
                </Space>
            </div>

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

                    {hasSelected && (
                        <Space>
                            <span style={{ color: 'var(--text-secondary)' }}>已选 {selectedRowKeys.length} 项</span>
                            <Button type="primary" icon={<CheckOutlined />} onClick={handleBatchConfirm}>
                                批量确认
                            </Button>
                            <Button danger icon={<CloseOutlined />} onClick={handleBatchCancel}>
                                批量取消
                            </Button>
                        </Space>
                    )}
                </div>

                <Table
                    loading={loading}
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="id"
                    rowSelection={rowSelection}
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
