import { useState, useEffect, useRef } from 'react';
import { Table, Card, Space, Button, Tag, Modal, Select, Input, Form, DatePicker, InputNumber, App } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, DownloadOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { reservationApi, Reservation, CreateReservationDto } from '../../api/reservations';
import { memberApi, Member } from '../../api/members';
import { tableApi, Table as TableType } from '../../api/tables';
import './Reservations.css';

const { Search } = Input;

export default function Reservations() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [searchText, setSearchText] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // 数据源
    const [members, setMembers] = useState<Member[]>([]);
    const [tables, setTables] = useState<TableType[]>([]);

    // 创建预约弹窗
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createForm] = Form.useForm();

    // 加载预约列表
    const loadReservations = async () => {
        setLoading(true);
        try {
            const data = await reservationApi.list({ status: statusFilter });
            setReservations(data);
        } catch (error) {
            message.error('加载预约列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 加载会员和桌位数据 (用于新建弹窗)
    const loadSupportData = async () => {
        try {
            const [memberData, tableData] = await Promise.all([
                memberApi.list(),
                tableApi.list()
            ]);
            setMembers(memberData);
            setTables(tableData);
        } catch (error) {
            console.error('加载辅助数据失败:', error);
        }
    };

    useEffect(() => {
        loadReservations();
    }, [statusFilter]);

    // 自动刷新（每10秒拉取一次新数据）
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        refreshIntervalRef.current = setInterval(() => {
            loadReservations();
        }, 10000); // 每10秒刷新
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [statusFilter]);

    useEffect(() => {
        if (createModalVisible) {
            loadSupportData();
        }
    }, [createModalVisible]);

    // 打开创建预约弹窗
    const handleOpenCreate = () => {
        createForm.resetFields();
        setCreateModalVisible(true);
    };

    // 创建预约
    const handleCreateSubmit = async () => {
        try {
            const values = await createForm.validateFields();
            const data: CreateReservationDto = {
                memberId: values.memberId,
                tableId: values.tableId,
                reservedAt: values.reservedAt.toISOString(),
                depositAmount: values.depositAmount,
                remark: values.remark,
            };
            await reservationApi.create(data);
            message.success('预约创建成功');
            setCreateModalVisible(false);
            loadReservations();
        } catch (error) {
            console.error('创建失败:', error);
            message.error('创建预约失败');
        }
    };

    // 批量确认
    const handleBatchConfirm = () => {
        const pendingIds = selectedRowKeys.filter(id =>
            reservations.find(r => r.id === id)?.status === 'PENDING'
        );

        if (pendingIds.length === 0) {
            message.warning('请选择待确认的预约');
            return;
        }

        modal.confirm({
            title: '批量确认预约',
            icon: <ExclamationCircleOutlined />,
            content: `确定要确认 ${pendingIds.length} 条预约吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await Promise.all(pendingIds.map(id => reservationApi.updateStatus(id as string, 'CONFIRMED')));
                    message.success(`已确认 ${pendingIds.length} 条预约`);
                    setSelectedRowKeys([]);
                    loadReservations();
                } catch (error) {
                    message.error('批量确认失败');
                }
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

        modal.confirm({
            title: '批量取消预约',
            icon: <ExclamationCircleOutlined />,
            content: `确定要取消 ${cancelableIds.length} 条预约吗？`,
            okText: '确认取消',
            okType: 'danger',
            cancelText: '返回',
            onOk: async () => {
                try {
                    await Promise.all(cancelableIds.map(id => reservationApi.cancel(id as string)));
                    message.success(`已取消 ${cancelableIds.length} 条预约`);
                    setSelectedRowKeys([]);
                    loadReservations();
                } catch (error) {
                    message.error('批量取消失败');
                }
            },
        });
    };

    // 导出
    const handleExport = () => {
        const dataToExport = selectedRowKeys.length > 0
            ? reservations.filter(r => selectedRowKeys.includes(r.id))
            : reservations;

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

    // 确认预约
    const handleConfirm = async (id: string) => {
        try {
            await reservationApi.updateStatus(id, 'CONFIRMED');
            message.success('已确认预约');
            loadReservations();
        } catch (error) {
            message.error('确认失败');
        }
    };

    // 取消预约
    const handleCancel = async (id: string) => {
        modal.confirm({
            title: '确认取消预约',
            content: '是否确认取消此预约？',
            okText: '确认',
            cancelText: '返回',
            onOk: async () => {
                try {
                    await reservationApi.cancel(id);
                    message.success('已取消预约');
                    loadReservations();
                } catch (error) {
                    message.error('取消失败');
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
            render: (record: Reservation) => {
                const name = record.member?.nickname || record.customerName || '-';
                const avatarUrl = record.member?.avatar || record.avatar;
                // 只有 http:// 或 https:// 开头的URL才有效（排除微信临时文件 http://tmp/ 和 wxfile://）
                const isValidUrl = avatarUrl && (avatarUrl.startsWith('https://') || (avatarUrl.startsWith('http://') && !avatarUrl.startsWith('http://tmp')));
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isValidUrl ? (
                            <img src={avatarUrl} alt="头像" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold-primary)', fontWeight: 'bold' }}>
                                {name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{name}</div>
                    </div>
                );
            },
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
            title: '座位',
            key: 'seatNumber',
            width: 80,
            align: 'center' as const,
            render: (record: Reservation) => (
                <span style={{
                    display: 'inline-block',
                    width: 28,
                    height: 28,
                    lineHeight: '28px',
                    textAlign: 'center',
                    background: 'rgba(212,175,55,0.15)',
                    color: 'var(--color-gold-primary)',
                    borderRadius: '50%',
                    fontWeight: 'bold',
                }}>
                    {record.seatNumber || '-'}
                </span>
            ),
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
                            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(record.id)}>确认</Button>
                            <Button danger icon={<CloseOutlined />} onClick={() => handleCancel(record.id)}>取消</Button>
                        </>
                    )}
                    {record.status === 'CONFIRMED' && (
                        <Button danger icon={<CloseOutlined />} onClick={() => handleCancel(record.id)}>取消</Button>
                    )}
                </Space>
            ),
        },
    ];

    const filteredData = reservations.filter((item) => {
        if (!searchText) return true;
        const text = searchText.toLowerCase();
        return (
            item.member?.nickname?.toLowerCase().includes(text) ||
            item.member?.phone?.includes(text) ||
            item.table?.name?.toLowerCase().includes(text)
        );
    });

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
                    <p>管理所有赛桌预约记录，支持管理员代客预约</p>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>
                        {hasSelected ? `导出选中 (${selectedRowKeys.length})` : '导出全部'}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                        新建预约
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
                            <Button type="primary" icon={<CheckOutlined />} onClick={handleBatchConfirm}>批量确认</Button>
                            <Button danger icon={<CloseOutlined />} onClick={handleBatchCancel}>批量取消</Button>
                        </Space>
                    )}
                </div>

                <Table
                    loading={loading}
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                />
            </Card>

            {/* 创建预约弹窗 */}
            <Modal
                title="新建预约"
                open={createModalVisible}
                onOk={handleCreateSubmit}
                onCancel={() => setCreateModalVisible(false)}
                okText="创建"
                cancelText="取消"
                width={500}
                destroyOnClose
            >
                <Form form={createForm} layout="vertical">
                    <Form.Item name="memberId" label="选择会员" rules={[{ required: true, message: '请选择会员' }]}>
                        <Select placeholder="搜索或选择会员" showSearch optionFilterProp="children">
                            {members.map(m => (
                                <Select.Option key={m.id} value={m.id}>{m.nickname} ({m.phone})</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="tableId" label="选择桌位" rules={[{ required: true, message: '请选择桌位' }]}>
                        <Select placeholder="选择桌位">
                            {tables.map(t => (
                                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="reservedAt" label="预约时间" rules={[{ required: true, message: '请选择预约时间' }]}>
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="depositAmount" label="订金金额">
                        <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="可选，输入订金金额" />
                    </Form.Item>
                    <Form.Item name="remark" label="备注">
                        <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
