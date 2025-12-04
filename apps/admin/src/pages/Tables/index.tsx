import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Select, message, Space, Modal, Form, Input, InputNumber } from 'antd';
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { tableApi, Table, CreateTableDto, UpdateTableDto } from '../../api/tables';
import './Tables.css';

const { confirm } = Modal;

export default function Tables() {
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [form] = Form.useForm();

    // 加载桌位列表
    const loadTables = async () => {
        setLoading(true);
        try {
            // 模拟数据 - 实际项目中使用 API
            const mockData: Table[] = [
                { id: '1', name: '主赛桌 A1', category: 'MAIN', status: 'AVAILABLE', capacity: 9, description: '巅峰对决桌', createdAt: '', updatedAt: '' },
                { id: '2', name: '主赛桌 A2', category: 'MAIN', status: 'IN_USE', capacity: 9, description: '巅峰对决桌', createdAt: '', updatedAt: '' },
                { id: '3', name: '副赛桌 B1', category: 'SIDE', status: 'RESERVED', capacity: 6, description: '轻松局', createdAt: '', updatedAt: '' },
                { id: '4', name: '副赛桌 B2', category: 'SIDE', status: 'AVAILABLE', capacity: 6, description: '轻松局', createdAt: '', updatedAt: '' },
                { id: '5', name: '练习桌 C1', category: 'TRAINING', status: 'IN_USE', capacity: 4, description: '新手练习', createdAt: '', updatedAt: '' },
                { id: '6', name: '餐饮区 D1', category: 'DINING', status: 'MAINTENANCE', capacity: 4, description: '用餐休息', createdAt: '', updatedAt: '' },
            ];
            setTables(mockData);
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

    // 打开新建弹窗
    const handleCreate = () => {
        setModalType('create');
        setEditingTable(null);
        form.resetFields();
        setModalVisible(true);
    };

    // 打开编辑弹窗
    const handleEdit = (table: Table) => {
        setModalType('edit');
        setEditingTable(table);
        form.setFieldsValue({
            name: table.name,
            category: table.category,
            capacity: table.capacity,
            description: table.description,
        });
        setModalVisible(true);
    };

    // 删除桌位
    const handleDelete = (table: Table) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除桌位「${table.name}」吗？此操作不可撤销！`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    // await tableApi.delete(table.id);
                    message.success('删除成功');
                    loadTables();
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (modalType === 'create') {
                // await tableApi.create(values);
                message.success('创建成功');
            } else {
                // await tableApi.update(editingTable!.id, values);
                message.success('更新成功');
            }

            setModalVisible(false);
            loadTables();
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 更新桌位状态
    const handleUpdateStatus = async (id: string, status: string) => {
        confirm({
            title: '确认更新状态',
            content: `是否将桌位状态更新为：${getStatusText(status)}？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    // await tableApi.updateStatus(id, status);
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
            TRAINING: '练习桌',
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

    // 筛选后的数据
    const filteredTables = tables.filter((table) => {
        if (categoryFilter && table.category !== categoryFilter) return false;
        if (statusFilter && table.status !== statusFilter) return false;
        return true;
    });

    return (
        <div className="tables-page page-enter">
            <div className="panel-header">
                <div>
                    <h2>桌位管理</h2>
                    <p>管理所有赛桌，包括新建、编辑和状态控制</p>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadTables}>
                        刷新
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                        新建桌位
                    </Button>
                </Space>
            </div>

            <Card bordered={false}>
                <div className="toolbar">
                    <Space size="middle">
                        <Select
                            placeholder="类别筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        >
                            <Select.Option value="MAIN">主赛桌</Select.Option>
                            <Select.Option value="SIDE">副赛桌</Select.Option>
                            <Select.Option value="TRAINING">练习桌</Select.Option>
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
                    </Space>
                </div>

                <Row gutter={[24, 24]}>
                    {filteredTables.map((table) => (
                        <Col key={table.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className={`table-card status-${table.status.toLowerCase()}`}
                                size="small"
                                loading={loading}
                                actions={[
                                    <EditOutlined key="edit" onClick={() => handleEdit(table)} />,
                                    <DeleteOutlined key="delete" onClick={() => handleDelete(table)} style={{ color: '#ff4d4f' }} />,
                                ]}
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
                                    {table.description && (
                                        <div className="description">{table.description}</div>
                                    )}
                                </div>

                                <div className="table-actions">
                                    <Space size="small" wrap>
                                        {table.status !== 'AVAILABLE' && (
                                            <Button size="small" onClick={() => handleUpdateStatus(table.id, 'AVAILABLE')}>
                                                空闲
                                            </Button>
                                        )}
                                        {table.status !== 'IN_USE' && (
                                            <Button size="small" type="primary" onClick={() => handleUpdateStatus(table.id, 'IN_USE')}>
                                                使用中
                                            </Button>
                                        )}
                                        {table.status !== 'MAINTENANCE' && (
                                            <Button size="small" danger onClick={() => handleUpdateStatus(table.id, 'MAINTENANCE')}>
                                                维护
                                            </Button>
                                        )}
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {filteredTables.length === 0 && !loading && (
                    <div className="empty-state">
                        <p>暂无桌位数据</p>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            新建第一个桌位
                        </Button>
                    </div>
                )}
            </Card>

            {/* 新建/编辑弹窗 */}
            <Modal
                title={modalType === 'create' ? '新建桌位' : '编辑桌位'}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => setModalVisible(false)}
                okText={modalType === 'create' ? '创建' : '保存'}
                cancelText="取消"
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ capacity: 6 }}
                >
                    <Form.Item
                        name="name"
                        label="桌位名称"
                        rules={[{ required: true, message: '请输入桌位名称' }]}
                    >
                        <Input placeholder="例如：主赛桌 A1" />
                    </Form.Item>

                    <Form.Item
                        name="category"
                        label="类别"
                        rules={[{ required: true, message: '请选择类别' }]}
                    >
                        <Select placeholder="选择类别">
                            <Select.Option value="MAIN">主赛桌</Select.Option>
                            <Select.Option value="SIDE">副赛桌</Select.Option>
                            <Select.Option value="TRAINING">练习桌</Select.Option>
                            <Select.Option value="DINING">餐饮区</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="capacity"
                        label="容量（人数）"
                        rules={[{ required: true, message: '请输入容量' }]}
                    >
                        <InputNumber min={1} max={20} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="描述"
                    >
                        <Input.TextArea placeholder="可选，简短描述" rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
