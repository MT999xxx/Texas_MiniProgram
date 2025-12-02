import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Select, message, Space, Modal, Form, Input, InputNumber } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { tableApi, Table, TableCategory, TableStatus, CreateTableDto, UpdateTableDto } from '../../api/tables';
import './Tables.css';

export default function Tables() {
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<TableCategory | undefined>();
    const [statusFilter, setStatusFilter] = useState<TableStatus | undefined>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [form] = Form.useForm();

    // 加载桌位列表
    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await tableApi.list({
                category: categoryFilter,
                status: statusFilter,
            });
            setTables(data);
        } catch (error) {
            console.error('加载桌位列表失败:', error);
            message.error('加载桌位列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTables();
    }, [categoryFilter, statusFilter]);

    // 打开新增/编辑弹窗
    const openModal = (table?: Table) => {
        setEditingTable(table || null);
        if (table) {
            form.setFieldsValue({
                name: table.name,
                category: table.category,
                capacity: table.capacity,
            });
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTable(null);
        form.resetFields();
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingTable) {
                // 编辑桌位
                await tableApi.update(editingTable.id, values as UpdateTableDto);
                message.success('桌位更新成功');
            } else {
                // 新增桌位
                await tableApi.create(values as CreateTableDto);
                message.success('桌位创建成功');
            }
            closeModal();
            loadTables();
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 删除桌位
    const handleDelete = (table: Table) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除桌位「${table.name}」吗？`,
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await tableApi.delete(table.id);
                    message.success('删除成功');
                    loadTables();
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    // 更新桌位状态
    const handleUpdateStatus = async (id: string, status: TableStatus) => {
        Modal.confirm({
            title: '确认更新状态',
            content: `是否将桌位状态更新为：${getStatusText(status)}？`,
            onOk: async () => {
                try {
                    await tableApi.updateStatus(id, status);
                    message.success('状态更新成功');
                    loadTables();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    // 状态文本映射
    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            AVAILABLE: '空闲',
            RESERVED: '已预约',
            IN_USE: '使用中',
            MAINTENANCE: '维护中',
        };
        return map[status] || status;
    };

    // 类别文本映射
    const getCategoryText = (category: string) => {
        const map: Record<string, string> = {
            MAIN: '主赛桌',
            SIDE: '副赛桌',
            DINING: '餐饮区',
        };
        return map[category] || category;
    };

    // 状态标签颜色
    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            AVAILABLE: 'green',
            RESERVED: 'orange',
            IN_USE: 'blue',
            MAINTENANCE: 'red',
        };
        return map[status] || 'default';
    };

    // 状态操作按钮
    const getStatusActions = (table: Table) => {
        const actions = [];

        if (table.status !== 'AVAILABLE') {
            actions.push(
                <Button
                    key="available"
                    size="small"
                    onClick={() => handleUpdateStatus(table.id, 'AVAILABLE')}
                >
                    设为空闲
                </Button>
            );
        }

        if (table.status !== 'IN_USE') {
            actions.push(
                <Button
                    key="in_use"
                    size="small"
                    type="primary"
                    onClick={() => handleUpdateStatus(table.id, 'IN_USE')}
                >
                    设为使用中
                </Button>
            );
        }

        if (table.status !== 'MAINTENANCE') {
            actions.push(
                <Button
                    key="maintenance"
                    size="small"
                    danger
                    onClick={() => handleUpdateStatus(table.id, 'MAINTENANCE')}
                >
                    维护中
                </Button>
            );
        }

        return actions;
    };

    return (
        <div className="tables-page">
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            新增桌位
                        </Button>

                        <Select
                            placeholder="类别筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        >
                            <Select.Option value="MAIN">主赛桌</Select.Option>
                            <Select.Option value="SIDE">副赛桌</Select.Option>
                            <Select.Option value="DINING">餐饮区</Select.Option>
                        </Select>

                        <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Select.Option value="AVAILABLE">空闲</Select.Option>
                            <Select.Option value="RESERVED">已预约</Select.Option>
                            <Select.Option value="IN_USE">使用中</Select.Option>
                            <Select.Option value="MAINTENANCE">维护中</Select.Option>
                        </Select>

                        <Button icon={<ReloadOutlined />} onClick={loadTables}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    {tables.map((table) => (
                        <Col key={table.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className={`table-card status-${table.status.toLowerCase()}`}
                                size="small"
                                loading={loading}
                            >
                                <div className="table-header">
                                    <h3>{table.name}</h3>
                                    <Tag color={getStatusColor(table.status)}>
                                        {getStatusText(table.status)}
                                    </Tag>
                                </div>

                                <div className="table-info">
                                    <div>类别：{getCategoryText(table.category)}</div>
                                    <div>容量：{table.capacity}人</div>
                                </div>

                                <div className="table-actions">
                                    <Space size="small" wrap>
                                        {getStatusActions(table)}
                                        <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => openModal(table)}
                                        >
                                            编辑
                                        </Button>
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDelete(table)}
                                        >
                                            删除
                                        </Button>
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {tables.length === 0 && !loading && (
                    <div className="empty-state">
                        <p>暂无桌位数据</p>
                    </div>
                )}
            </Card>

            {/* 新增/编辑桌位弹窗 */}
            <Modal
                title={editingTable ? '编辑桌位' : '新增桌位'}
                open={isModalOpen}
                onOk={handleSubmit}
                onCancel={closeModal}
                okText="确定"
                cancelText="取消"
            >
                <Form
                    form={form}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label="桌位名称"
                        name="name"
                        rules={[
                            { required: true, message: '请输入桌位名称' },
                            { max: 50, message: '名称不能超过50个字符' },
                        ]}
                    >
                        <Input placeholder="例如：主桌A1" />
                    </Form.Item>

                    <Form.Item
                        label="桌位类别"
                        name="category"
                        rules={[{ required: true, message: '请选择桌位类别' }]}
                    >
                        <Select placeholder="请选择">
                            <Select.Option value={TableCategory.MAIN}>主赛桌</Select.Option>
                            <Select.Option value={TableCategory.SIDE}>副赛桌</Select.Option>
                            <Select.Option value={TableCategory.DINING}>餐饮区</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="容量（人数）"
                        name="capacity"
                        rules={[
                            { required: true, message: '请输入容量' },
                            { type: 'number', min: 1, max: 20, message: '容量需在1-20之间' },
                        ]}
                    >
                        <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="请输入" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
