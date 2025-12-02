import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, InputNumber, Select, Form, Input } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { menuApi, MenuItem, MenuCategory, CreateMenuItemDto } from '../../api/menu';
import './Menu.css';

export default function Menu() {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [form] = Form.useForm();

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
        }
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await menuApi.listMenuItems(categoryFilter);
            setItems(data);
        } catch (error) {
            message.error('加载菜品失败');
            console.error('加载错误:', error);
        } finally {
            setLoading(false);
        }
    };

    // 打开新增/编辑弹窗
    const openModal = (item?: MenuItem) => {
        setEditingItem(item || null);
        if (item) {
            form.setFieldsValue({
                name: item.name,
                categoryId: item.category.id,
                price: item.price,
                stock: item.stock,
                desc: item.description,
            });
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        form.resetFields();
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingItem) {
                // 编辑菜品
                await menuApi.updateMenuItem(editingItem.id, values);
                message.success('菜品更新成功');
            } else {
                // 新增菜品
                await menuApi.createMenuItem(values as CreateMenuItemDto);
                message.success('菜品创建成功');
            }
            closeModal();
            loadItems();
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 删除菜品
    const handleDelete = (item: MenuItem) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除菜品「${item.name}」吗？`,
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await menuApi.deleteMenuItem(item.id);
                    message.success('删除成功');
                    loadItems();
                } catch (error) {
                    message.error('删除失败');
                }
            },
        });
    };

    // 更新库存
    const handleUpdateStock = (item: MenuItem) => {
        let newStock = item.stock;
        Modal.confirm({
            title: '更新库存',
            content: (
                <div>
                    <p>当前库存：{item.stock}</p>
                    <p>新库存：
                        <InputNumber
                            min={0}
                            defaultValue={item.stock}
                            onChange={(value) => newStock = value || 0}
                        />
                    </p>
                </div>
            ),
            onOk: async () => {
                try {
                    await menuApi.updateStock(item.id, newStock);
                    message.success('库存更新成功');
                    loadItems();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    const columns: ColumnsType<MenuItem> = [
        {
            title: '菜品名称',
            key: 'name',
            render: (record: MenuItem) => record?.name || '-',
        },
        {
            title: '分类',
            key: 'category',
            render: (record: MenuItem) => {
                return record?.category?.name || '-';
            },
        },
        {
            title: '价格',
            key: 'price',
            render: (record: MenuItem) => {
                const price = record?.price;
                if (price === undefined || price === null) return '-';
                return `¥${Number(price).toFixed(2)}`;
            },
        },
        {
            title: '库存',
            key: 'stock',
            render: (record: MenuItem) => {
                const stock = record?.stock;
                if (stock === undefined || stock === null) return '-';
                const stockNum = Number(stock);
                return (
                    <Tag color={stockNum > 10 ? 'green' : stockNum > 0 ? 'orange' : 'red'}>
                        {stockNum}
                    </Tag>
                );
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const map: Record<string, { text: string; color: string }> = {
                    'ON_SALE': { text: '在售', color: 'green' },
                    'OFF_SALE': { text: '下架', color: 'default' },
                    'SOLD_OUT': { text: '售罄', color: 'red' },
                };
                const info = map[status] || { text: status, color: 'default' };
                return <Tag color={info.color}>{info.text}</Tag>;
            },
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" onClick={() => handleUpdateStock(record)}>
                        更新库存
                    </Button>
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

    // 创建分类映射
    const categoriesMap = new Map(categories.map(c => [c.id, c.name]));

    // Table数据源
    const dataSource = (items || []).filter(item => item !== null && item !== undefined).map((item) => ({
        key: item.id,
        ...item,
    }));

    return (
        <div className="menu-page">
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            新增菜品
                        </Button>

                        <Select
                            placeholder="分类筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        >
                            {categories.map(cat => (
                                <Select.Option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </Select.Option>
                            ))}
                        </Select>

                        <Button icon={<ReloadOutlined />} onClick={loadItems}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={dataSource}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* 新增/编辑菜品弹窗 */}
            <Modal
                title={editingItem ? '编辑菜品' : '新增菜品'}
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
                        label="菜品名称"
                        name="name"
                        rules={[
                            { required: true, message: '请输入菜品名称' },
                            { max: 50, message: '名称不能超过50个字符' },
                        ]}
                    >
                        <Input placeholder="例如：可口可乐" />
                    </Form.Item>

                    <Form.Item
                        label="分类"
                        name="categoryId"
                        rules={[{ required: true, message: '请选择分类' }]}
                    >
                        <Select placeholder="请选择">
                            {categories.map(cat => (
                                <Select.Option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="价格（元）"
                        name="price"
                        rules={[
                            { required: true, message: '请输入价格' },
                            { type: 'number', min: 0.01, message: '价格必须大于0' },
                        ]}
                    >
                        <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} placeholder="请输入" />
                    </Form.Item>

                    <Form.Item
                        label="库存"
                        name="stock"
                        rules={[
                            { required: true, message: '请输入库存' },
                            { type: 'number', min: 0, message: '库存不能为负数' },
                        ]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入" />
                    </Form.Item>

                    <Form.Item
                        label="描述"
                        name="desc"
                    >
                        <Input.TextArea rows={3} placeholder="菜品描述（可选）" maxLength={200} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
