import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { reservationApi, Reservation, ReservationStatus, CreateReservationDto } from '../../api/reservations';
import { tableApi } from '../../api/tables';
import dayjs from 'dayjs';
import './Reservations.css';

export default function Reservations() {
    const [loading, setLoading] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<ReservationStatus>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadReservations();
        loadTables();
    }, []);

    useEffect(() => {
        loadReservations();
    }, [statusFilter]);

    const loadTables = async () => {
        try {
            const data = await tableApi.list();
            setTables(data);
        } catch (error) {
            console.error('加载桌位失败:', error);
        }
    };

    const loadReservations = async () => {
        setLoading(true);
        try {
            const data = await reservationApi.list({
                status: statusFilter,
            });
            setReservations(data);
        } catch (error) {
            message.error('加载预约列表失败');
            console.error('加载错误:', error);
        } finally {
            setLoading(false);
        }
    };

    // 打开新增/编辑弹窗
    const openModal = (reservation?: Reservation) => {
        setEditingReservation(reservation || null);
        if (reservation) {
            form.setFieldsValue({
                customerName: reservation.customerName,
                phone: reservation.phone,
                partySize: reservation.partySize,
                tableId: reservation.table.id,
                reservedAt: dayjs(reservation.reservedAt),
                note: reservation.note,
            });
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingReservation(null);
        form.resetFields();
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const data = {
                ...values,
                reservedAt: values.reservedAt.toISOString(),
            };

            if (editingReservation) {
                await reservationApi.update(editingReservation.id, data);
                message.success('预约更新成功');
            } else {
                await reservationApi.create(data as CreateReservationDto);
                message.success('预约创建成功');
            }
            closeModal();
            loadReservations();
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 删除预约
    const handleDelete = (reservation: Reservation) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除「${reservation.customerName}」的预约吗？`,
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await reservationApi.delete(reservation.id);
                    message.success('删除成功');
                    loadReservations();
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    // 更新预约状态
    const handleUpdateStatus = async (id: string, status: ReservationStatus) => {
        try {
            await reservationApi.updateStatus(id, status);
            message.success('状态更新成功');
            loadReservations();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            PENDING: '待确认',
            CONFIRMED: '已确认',
            CHECKED_IN: '已入座',
            COMPLETED: '已完成',
            CANCELLED: '已取消',
        };
        return map[status] || status;
    };

    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            PENDING: 'orange',
            CONFIRMED: 'blue',
            CHECKED_IN: 'green',
            COMPLETED: 'default',
            CANCELLED: 'red',
        };
        return map[status] || 'default';
    };

    const columns: ColumnsType<Reservation> = [
        {
            title: '客户姓名',
            dataIndex: 'customerName',
            key: 'customerName',
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: '人数',
            dataIndex: 'partySize',
            key: 'partySize',
        },
        {
            title: '桌位',
            key: 'table',
            render: (_, record) => record.table?.name || '-',
        },
        {
            title: '预约时间',
            dataIndex: 'reservedAt',
            key: 'reservedAt',
            render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: '备注',
            dataIndex: 'note',
            key: 'note',
            ellipsis: true,
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    {record.status === 'PENDING' && (
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => handleUpdateStatus(record.id, ReservationStatus.CONFIRMED)}
                        >
                            确认
                        </Button>
                    )}
                    {record.status === 'CONFIRMED' && (
                        <Button
                            size="small"
                            onClick={() => handleUpdateStatus(record.id, ReservationStatus.CHECKED_IN)}
                        >
                            入座
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openModal(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="reservations-page">
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            新增预约
                        </Button>

                        <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Select.Option value={ReservationStatus.PENDING}>待确认</Select.Option>
                            <Select.Option value={ReservationStatus.CONFIRMED}>已确认</Select.Option>
                            <Select.Option value={ReservationStatus.CHECKED_IN}>已入座</Select.Option>
                            <Select.Option value={ReservationStatus.COMPLETED}>已完成</Select.Option>
                            <Select.Option value={ReservationStatus.CANCELLED}>已取消</Select.Option>
                        </Select>

                        <Button icon={<ReloadOutlined />} onClick={loadReservations}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={reservations}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* 新增/编辑预约弹窗 */}
            <Modal
                title={editingReservation ? '编辑预约' : '新增预约'}
                open={isModalOpen}
                onOk={handleSubmit}
                onCancel={closeModal}
                okText="确定"
                cancelText="取消"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label="客户姓名"
                        name="customerName"
                        rules={[{ required: true, message: '请输入客户姓名' }]}
                    >
                        <Input placeholder="请输入客户姓名" />
                    </Form.Item>

                    <Form.Item
                        label="手机号"
                        name="phone"
                        rules={[
                            { required: true, message: '请输入手机号' },
                            { pattern: /^1\d{10}$/, message: '请输入有效的手机号' },
                        ]}
                    >
                        <Input placeholder="请输入手机号" />
                    </Form.Item>

                    <Form.Item
                        label="人数"
                        name="partySize"
                        rules={[{ required: true, message: '请输入人数' }]}
                    >
                        <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="请输入人数" />
                    </Form.Item>

                    <Form.Item
                        label="桌位"
                        name="tableId"
                        rules={[{ required: true, message: '请选择桌位' }]}
                    >
                        <Select placeholder="请选择桌位">
                            {tables.map(table => (
                                <Select.Option key={table.id} value={table.id}>
                                    {table.name} ({table.capacity}人)
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="预约时间"
                        name="reservedAt"
                        rules={[{ required: true, message: '请选择预约时间' }]}
                    >
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            style={{ width: '100%' }}
                            placeholder="请选择预约时间"
                        />
                    </Form.Item>

                    <Form.Item
                        label="备注"
                        name="note"
                    >
                        <Input.TextArea rows={3} placeholder="备注信息（可选）" maxLength={200} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
