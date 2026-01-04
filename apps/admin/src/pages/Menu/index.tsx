import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Tabs, Popconfirm, App, Upload, message as antdMessage } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd';
import { menuApi, MenuItem, MenuCategory } from '../../api/menu';
import './Menu.css';

const { confirm } = Modal;

export default function Menu() {
    const { message } = App.useApp();
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

    // 图片上传
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string>();

    useEffect(() => {
        loadCategories();
        loadItems();
    }, []);

    useEffect(() => {
        loadItems();
    }, [categoryFilter]);

    const loadCategories = async () => {
        try {
            const data = await menuApi.listCategories();
            setCategories(data);
        } catch (error) {
            console.error('加载分类失败:', error);
            message.error('加载分类失败');
        }
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await menuApi.listItems(categoryFilter);
            setItems(data);
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
        setImageUrl(undefined);
        setItemModalVisible(true);
    };

    const handleEditItem = (item: MenuItem) => {
        setItemModalType('edit');
        setEditingItem(item);
        itemForm.setFieldsValue({
            name: item.name,
            categoryId: item.category?.id || item.categoryId,
            price: item.price,
            stock: item.stock,
            description: item.description,
            imageUrl: item.imageUrl,
        });
        setImageUrl(item.imageUrl);
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
                try {
                    await menuApi.deleteItem(item.id);
                    message.success('删除成功');
                    loadItems();
                } catch (err) {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleItemSubmit = async () => {
        try {
            const values = await itemForm.validateFields();
            const submitData = {
                ...values,
                price: Number(values.price),
                stock: Number(values.stock),
            };

            if (itemModalType === 'create') {
                await menuApi.createItem(submitData);
                message.success('创建成功');
            } else {
                await menuApi.updateItem(editingItem!.id, submitData);
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
        try {
            await menuApi.updateStatus(item.id, newStatus);
            message.success(newStatus === 'ON_SALE' ? '已上架' : '已下架');
            loadItems();
        } catch (err) {
            message.error('状态更新失败');
        }
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
            sort: category.sort,
        });
        setCategoryModalVisible(true);
    };

    const handleDeleteCategory = async (category: MenuCategory) => {
        try {
            await menuApi.deleteCategory(category.id);
            message.success('删除成功');
            loadCategories();
        } catch (err) {
            message.error('删除失败，可能该分类下仍有菜品');
        }
    };

    const handleCategorySubmit = async () => {
        try {
            const values = await categoryForm.validateFields();
            if (categoryModalType === 'create') {
                await menuApi.createCategory(values);
                message.success('创建成功');
            } else {
                await menuApi.updateCategory(editingCategory!.id, values);
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
            title: '图片',
            key: 'imageUrl',
            width: 80,
            render: (record: MenuItem) => (
                record.imageUrl ? (
                    <img
                        src={record.imageUrl}
                        alt={record.name}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                ) : (
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border-color)'
                    }}>
                        无图
                    </div>
                )
            ),
        },
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
            render: (price: number | string) => (
                <span style={{ color: 'var(--color-gold-primary)', fontWeight: 'bold', fontFamily: 'DIN Alternate' }}>
                    ¥{Number(price).toFixed(2)}
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
        { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
        { title: '排序', dataIndex: 'sort', key: 'sort' },
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

            <Card variant="borderless">
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
                                        loading={loading}
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
                destroyOnHidden
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
                    <Form.Item label="菜品图片" name="imageUrl">
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            action={`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/uploads/image`}
                            beforeUpload={(file) => {
                                const isImage = file.type.startsWith('image/');
                                if (!isImage) {
                                    antdMessage.error('只能上传图片文件!');
                                }
                                const isLt5M = file.size / 1024 / 1024 < 5;
                                if (!isLt5M) {
                                    antdMessage.error('图片必须小于 5MB!');
                                }
                                return isImage && isLt5M;
                            }}
                            onChange={(info) => {
                                if (info.file.status === 'uploading') {
                                    setUploading(true);
                                    return;
                                }
                                if (info.file.status === 'done') {
                                    setUploading(false);
                                    const url = info.file.response?.url;
                                    if (url) {
                                        // 拼接完整URL
                                        const fullUrl = `${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}${url}`;
                                        setImageUrl(fullUrl);
                                        itemForm.setFieldValue('imageUrl', fullUrl);
                                        antdMessage.success('图片上传成功');
                                    }
                                }
                                if (info.file.status === 'error') {
                                    setUploading(false);
                                    antdMessage.error('图片上传失败');
                                }
                            }}
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="菜品图片" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                                    <div style={{ marginTop: 8, fontSize: 12 }}>{uploading ? '上传中...' : '点击上传'}</div>
                                </div>
                            )}
                        </Upload>
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
                destroyOnHidden
            >
                <Form form={categoryForm} layout="vertical" initialValues={{ sort: 1 }}>
                    <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
                        <Input placeholder="例如：威士忌" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="sort" label="排序">
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
