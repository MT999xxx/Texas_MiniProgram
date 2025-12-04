import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Form, Input, InputNumber, Select, Tabs, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { menuApi, MenuItem, MenuCategory, CreateItemDto, UpdateItemDto } from '../../api/menu';
import './Menu.css';

const { confirm } = Modal;

export default function Menu() {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>();

    // 菜品弹窗
    const [itemModalVisible, setItemModalVisible] = useState(false);
    const [itemModalType, setItemModalType] = useState<'create' | 'edit'>('create');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [itemForm] = Form.useForm();

    // 分类弹窗
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [categoryModalType, setCategoryModalType] = useState<'create' | 'edit'>('create');
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
    const [categoryForm] = Form.useForm();

    useEffect(() => {
        loadCategories();
        loadItems();
    }, []);

    useEffect(() => {
        loadItems();
    }, [categoryFilter]);

    const loadCategories = async () => {
        try {
            // 模拟数据
            const mockCategories: MenuCategory[] = [
                { id: '1', name: '精酿啤酒', description: '进口精酿', sortOrder: 1, createdAt: '', updatedAt: '' },
                { id: '2', name: '威士忌', description: '单一麦芽', sortOrder: 2, createdAt: '', updatedAt: '' },
                { id: '3', name: '鸡尾酒', description: '特调', sortOrder: 3, createdAt: '', updatedAt: '' },
                { id: '4', name: '小食', description: '佐酒小食', sortOrder: 4, createdAt: '', updatedAt: '' },
            ];
            setCategories(mockCategories);
        } catch (error) {
            console.error('加载分类失败:', error);
        }
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            // 模拟数据
            const mockItems: MenuItem[] = [
                { id: '1', name: '火焰威士忌塔', description: '会员9折', price: 188, stock: 50, category: { id: '2', name: '威士忌', sortOrder: 2, createdAt: '', updatedAt: '' }, status: 'ON_SALE', createdAt: '', updatedAt: '' },
                { id: '2', name: '冠军定制套餐', description: '主厨推荐', price: 268, stock: 20, category: { id: '4', name: '小食', sortOrder: 4, createdAt: '', updatedAt: '' }, status: 'ON_SALE', createdAt: '', updatedAt: '' },
                { id: '3', name: '午夜能量Shot', description: '限定', price: 58, stock: 100, category: { id: '3', name: '鸡尾酒', sortOrder: 3, createdAt: '', updatedAt: '' }, status: 'ON_SALE', createdAt: '', updatedAt: '' },
                { id: '4', name: '皇家精酿', description: '进口', price: 68, stock: 0, category: { id: '1', name: '精酿啤酒', sortOrder: 1, createdAt: '', updatedAt: '' }, status: 'SOLD_OUT', createdAt: '', updatedAt: '' },
                { id: '5', name: '经典莫吉托', description: '清爽', price: 48, stock: 30, category: { id: '3', name: '鸡尾酒', sortOrder: 3, createdAt: '', updatedAt: '' }, status: 'OFF_SHELF', createdAt: '', updatedAt: '' },
            ];
            setItems(mockItems);
        } catch (error) {
            message.error('加载菜品失败');
        } finally {
            setLoading(false);
        }
    };

    // ========== 菜品操作 ==========
    const handleCreateItem = () => {
        setItemModalType('create');
        setEditingItem(null);
        itemForm.resetFields();
        setItemModalVisible(true);
    };

    const handleEditItem = (item: MenuItem) => {
        setItemModalType('edit');
        setEditingItem(item);
        itemForm.setFieldsValue({
            name: item.name,
            categoryId: item.category?.id,
            price: item.price,
            stock: item.stock,
            description: item.description,
        });
        setItemModalVisible(true);
    };

    const handleDeleteItem = (item: MenuItem) => {
        confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除菜品「${item.name}」吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                // await menuApi.deleteItem(item.id);
                message.success('删除成功');
                loadItems();
            },
        });
    };

    const handleItemSubmit = async () => {
        try {
            const values = await itemForm.validateFields();
            if (itemModalType === 'create') {
                // await menuApi.createItem(values);
                message.success('创建成功');
            } else {
                // await menuApi.updateItem(editingItem!.id, values);
                message.success('更新成功');
            }
            setItemModalVisible(false);
            loadItems();
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    const handleToggleStatus = async (item: MenuItem) => {
        const newStatus = item.status === 'ON_SALE' ? 'OFF_SHELF' : 'ON_SALE';
        // await menuApi.updateStatus(item.id, newStatus);
        message.success(newStatus === 'ON_SALE' ? '已上架' : '已下架');
        loadItems();
    };

    // ========== 分类操作 ==========
    const handleCreateCategory = () => {
        setCategoryModalType('create');
        setEditingCategory(null);
        categoryForm.resetFields();
        setCategoryModalVisible(true);
    };

    const handleEditCategory = (category: MenuCategory) => {
        setCategoryModalType('edit');
        setEditingCategory(category);
        categoryForm.setFieldsValue({
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
        });
        setCategoryModalVisible(true);
    };

    const handleDeleteCategory = async (category: MenuCategory) => {
        // await menuApi.deleteCategory(category.id);
        message.success('删除成功');
        loadCategories();
    };

    const handleCategorySubmit = async () => {
        try {
            const values = await categoryForm.validateFields();
            if (categoryModalType === 'create') {
                // await menuApi.createCategory(values);
                message.success('创建成功');
            } else {
                // await menuApi.updateCategory(editingCategory!.id, values);
                message.success('更新成功');
            }
            setCategoryModalVisible(false);
            loadCategories();
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    // 表格列定义
    const columns: ColumnsType<MenuItem> = [
        {
            title: '菜品名称',
            key: 'name',
            render: (record: MenuItem) => (
                <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{record.name}</div>
                    {record.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{record.description}</div>
                    )}
                </div>
            ),
        },
        {
            title: '分类',
            key: 'category',
            render: (record: MenuItem) => <Tag>{record.category?.name || '-'}</Tag>,
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            render: (price: number) => (
                <span style={{ color: 'var(--color-gold-primary)', fontWeight: 'bold', fontFamily: 'DIN Alternate' }}>
                    ¥{price.toFixed(2)}
                </span>
            ),
        },
        {
            title: '库存',
            dataIndex: 'stock',
            key: 'stock',
            render: (stock: number) => (
                <Tag color={stock > 10 ? 'green' : stock > 0 ? 'orange' : 'red'}>
                    {stock}
                </Tag>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const config: Record<string, { color: string; text: string }> = {
                    ON_SALE: { color: 'green', text: '在售' },
                    OFF_SHELF: { color: 'default', text: '下架' },
                    SOLD_OUT: { color: 'red', text: '售罄' },
                };
                const { color, text } = config[status] || { color: 'default', text: status };
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (record: MenuItem) => (
                <Space>
                    <Button size="small" onClick={() => handleToggleStatus(record)}>
                        {record.status === 'ON_SALE' ? '下架' : '上架'}
                    </Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record)}>
                        编辑
                    </Button>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(record)}>
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    // 分类表格列
    const categoryColumns: ColumnsType<MenuCategory> = [
        { title: '分类名称', dataIndex: 'name', key: 'name' },
        { title: '描述', dataIndex: 'description', key: 'description', render: (v) => v || '-' },
        { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
        {
            title: '操作',
            key: 'action',
            render: (record: MenuCategory) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(record)}>
                        编辑
                    </Button>
                    <Popconfirm title="确定删除该分类？" onConfirm={() => handleDeleteCategory(record)} okText="删除" cancelText="取消">
                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="menu-page page-enter">
            <div className="panel-header">
                <div>
                    <h2>菜单管理</h2>
                    <p>管理菜品分类和菜品信息</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateItem}>
                    新建菜品
                </Button>
            </div>

            <Card bordered={false}>
                <Tabs
                    defaultActiveKey="items"
                    items={[
                        {
                            key: 'items',
                            label: '菜品列表',
                            children: (
                                <>
                                    <div className="toolbar">
                                        <Space>
                                            <Select
                                                placeholder="分类筛选"
                                                style={{ width: 150 }}
                                                allowClear
                                                value={categoryFilter}
                                                onChange={setCategoryFilter}
                                            >
                                                {categories.map(cat => (
                                                    <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                                                ))}
                                            </Select>
                                            <Button icon={<ReloadOutlined />} onClick={loadItems}>刷新</Button>
                                        </Space>
                                    </div>
                                    <Table
                                        loading={loading}
                                        dataSource={items}
                                        columns={columns}
                                        rowKey="id"
                                        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
                                    />
                                </>
                            ),
                        },
                        {
                            key: 'categories',
                            label: '分类管理',
                            children: (
                                <>
                                    <div className="toolbar">
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCategory}>
                                            新建分类
                                        </Button>
                                    </div>
                                    <Table
                                        dataSource={categories}
                                        columns={categoryColumns}
                                        rowKey="id"
                                        pagination={false}
                                    />
                                </>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* 菜品弹窗 */}
            <Modal
                title={itemModalType === 'create' ? '新建菜品' : '编辑菜品'}
                open={itemModalVisible}
                onOk={handleItemSubmit}
                onCancel={() => setItemModalVisible(false)}
                okText={itemModalType === 'create' ? '创建' : '保存'}
                cancelText="取消"
                destroyOnClose
            >
                <Form form={itemForm} layout="vertical">
                    <Form.Item name="name" label="菜品名称" rules={[{ required: true, message: '请输入菜品名称' }]}>
                        <Input placeholder="例如：火焰威士忌塔" />
                    </Form.Item>
                    <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                        <Select placeholder="选择分类">
                            {categories.map(cat => (
                                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
                    </Form.Item>
                    <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input.TextArea placeholder="可选，简短描述" rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 分类弹窗 */}
            <Modal
                title={categoryModalType === 'create' ? '新建分类' : '编辑分类'}
                open={categoryModalVisible}
                onOk={handleCategorySubmit}
                onCancel={() => setCategoryModalVisible(false)}
                okText={categoryModalType === 'create' ? '创建' : '保存'}
                cancelText="取消"
                destroyOnClose
            >
                <Form form={categoryForm} layout="vertical" initialValues={{ sortOrder: 1 }}>
                    <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
                        <Input placeholder="例如：威士忌" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="排序">
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
