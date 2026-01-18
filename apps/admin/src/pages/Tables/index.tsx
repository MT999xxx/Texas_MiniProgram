import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Select, Space, Modal, Form, Input, InputNumber, App, Drawer, Tabs, List, Badge, Empty, Spin } from 'antd';
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, ShoppingCartOutlined, MinusOutlined, ClearOutlined } from '@ant-design/icons';
import { tableApi, Table } from '../../api/tables';
import { menuApi, MenuCategory, MenuItem } from '../../api/menu';
import { orderApi } from '../../api/orders';
import './Tables.css';

// 购物车项类型
interface CartItem {
    item: MenuItem;
    quantity: number;
}

export default function Tables() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [form] = Form.useForm();

    // 点餐抽屉状态
    const [orderDrawerVisible, setOrderDrawerVisible] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [menuLoading, setMenuLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
    const [submitting, setSubmitting] = useState(false);
    const [resetting, setResetting] = useState(false);

    // 加载桌位列表
    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await tableApi.list({ category: categoryFilter, status: statusFilter });
            setTables(data);
        } catch (error) {
            console.error('加载桌位列表失败:', error);
            message.error('加载桌位列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 加载菜单数据
    const loadMenu = async () => {
        setMenuLoading(true);
        try {
            const [categories, items] = await Promise.all([
                menuApi.listCategories(),
                menuApi.listItems(),
            ]);
            setMenuCategories(categories);
            setMenuItems(items.filter(item => item.status === 'ON_SALE'));
            if (categories.length > 0) {
                setActiveCategory(categories[0].id);
            }
        } catch (error) {
            console.error('加载菜单失败:', error);
            message.error('加载菜单失败');
        } finally {
            setMenuLoading(false);
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

    // 重置所有桌位
    const handleResetAll = () => {
        modal.confirm({
            title: '确认重置所有桌位',
            icon: <ExclamationCircleOutlined />,
            content: '此操作将把所有桌位状态重置为「空闲」，并取消所有过期预约。确定继续？',
            okText: '确认重置',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setResetting(true);
                try {
                    const result = await tableApi.resetAll();
                    message.success(`重置完成：${result.tablesReset} 个桌位已释放，${result.reservationsCancelled} 条预约已取消`);
                    loadTables();
                } catch (error) {
                    console.error('重置桌位失败:', error);
                    message.error('重置桌位失败');
                } finally {
                    setResetting(false);
                }
            },
        });
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
        modal.confirm({
            title: '确认删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除桌位「${table.name}」吗？此操作不可撤销！`,
            okText: '删除',
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

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (modalType === 'create') {
                await tableApi.create(values);
                message.success('创建成功');
            } else {
                await tableApi.update(editingTable!.id, values);
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
        modal.confirm({
            title: '确认更新状态',
            content: `是否将桌位状态更新为：${getStatusText(status)}？`,
            okText: '确认',
            cancelText: '取消',
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

    // 打开点餐抽屉
    const handleOpenOrder = (table: Table) => {
        setSelectedTable(table);
        setCart(new Map());
        setOrderDrawerVisible(true);
        loadMenu();
    };

    // 添加商品到购物车
    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const newCart = new Map(prev);
            const existing = newCart.get(item.id);
            if (existing) {
                newCart.set(item.id, { ...existing, quantity: existing.quantity + 1 });
            } else {
                newCart.set(item.id, { item, quantity: 1 });
            }
            return newCart;
        });
    };

    // 减少购物车商品数量
    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const newCart = new Map(prev);
            const existing = newCart.get(itemId);
            if (existing && existing.quantity > 1) {
                newCart.set(itemId, { ...existing, quantity: existing.quantity - 1 });
            } else {
                newCart.delete(itemId);
            }
            return newCart;
        });
    };

    // 计算购物车总数量
    const getCartCount = () => {
        let count = 0;
        cart.forEach(item => count += item.quantity);
        return count;
    };

    // 计算购物车总金额
    const getCartTotal = () => {
        let total = 0;
        cart.forEach(item => total += item.item.price * item.quantity);
        return total;
    };

    // 提交订单
    const handleSubmitOrder = async () => {
        if (cart.size === 0) {
            message.warning('请先添加商品到购物车');
            return;
        }

        setSubmitting(true);
        try {
            const items = Array.from(cart.values()).map(cartItem => ({
                menuItemId: cartItem.item.id,
                quantity: cartItem.quantity,
            }));

            await orderApi.create({
                tableId: selectedTable!.id,
                items,
            });

            message.success(`已为「${selectedTable!.name}」创建订单`);
            setOrderDrawerVisible(false);
            setCart(new Map());
        } catch (error) {
            console.error('创建订单失败:', error);
            message.error('创建订单失败');
        } finally {
            setSubmitting(false);
        }
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
            MAIN: '高额桌',
            SIDE: '低额桌',
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

    // 获取当前分类下的菜品
    const getCurrentCategoryItems = () => {
        return menuItems.filter(item => item.category?.id === activeCategory);
    };

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
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleResetAll}
                        loading={resetting}
                        danger
                    >
                        重置桌位
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
                            <Select.Option value="MAIN">高额桌</Select.Option>
                            <Select.Option value="SIDE">低额桌</Select.Option>

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
                    {tables.map((table) => (
                        <Col key={table.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className={`table-card status-${table.status.toLowerCase()}`}
                                size="small"
                                loading={loading}
                                actions={[
                                    <ShoppingCartOutlined key="order" onClick={() => handleOpenOrder(table)} title="点餐" />,
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

                {tables.length === 0 && !loading && (
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
                            <Select.Option value="MAIN">高额桌</Select.Option>
                            <Select.Option value="SIDE">低额桌</Select.Option>

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

            {/* 点餐抽屉 */}
            <Drawer
                title={`${selectedTable?.name || ''} - 点餐`}
                placement="right"
                width={600}
                open={orderDrawerVisible}
                onClose={() => setOrderDrawerVisible(false)}
                extra={
                    <Badge count={getCartCount()} offset={[-5, 5]}>
                        <ShoppingCartOutlined style={{ fontSize: 20 }} />
                    </Badge>
                }
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ marginRight: 16 }}>共 {getCartCount()} 件</span>
                            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#d4a84b' }}>
                                ¥{getCartTotal().toFixed(2)}
                            </span>
                        </div>
                        <Button
                            type="primary"
                            onClick={handleSubmitOrder}
                            loading={submitting}
                            disabled={cart.size === 0}
                        >
                            提交订单
                        </Button>
                    </div>
                }
            >
                {menuLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 16 }}>
                        {/* 分类列表 */}
                        <div style={{ width: 120, flexShrink: 0 }}>
                            <Tabs
                                tabPosition="left"
                                activeKey={activeCategory}
                                onChange={setActiveCategory}
                                items={menuCategories.map(cat => ({
                                    key: cat.id,
                                    label: cat.name,
                                }))}
                            />
                        </div>

                        {/* 菜品列表 */}
                        <div style={{ flex: 1 }}>
                            {getCurrentCategoryItems().length === 0 ? (
                                <Empty description="该分类暂无商品" />
                            ) : (
                                <List
                                    dataSource={getCurrentCategoryItems()}
                                    renderItem={(item) => {
                                        const cartItem = cart.get(item.id);
                                        return (
                                            <List.Item
                                                actions={[
                                                    cartItem ? (
                                                        <Space>
                                                            <Button
                                                                size="small"
                                                                icon={<MinusOutlined />}
                                                                onClick={() => removeFromCart(item.id)}
                                                            />
                                                            <span style={{ minWidth: 20, textAlign: 'center' }}>
                                                                {cartItem.quantity}
                                                            </span>
                                                            <Button
                                                                size="small"
                                                                type="primary"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => addToCart(item)}
                                                            />
                                                        </Space>
                                                    ) : (
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<PlusOutlined />}
                                                            onClick={() => addToCart(item)}
                                                        >
                                                            添加
                                                        </Button>
                                                    ),
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    title={item.name}
                                                    description={
                                                        <div>
                                                            <span style={{ color: '#d4a84b', fontWeight: 'bold' }}>
                                                                ¥{item.price}
                                                            </span>
                                                            {item.description && (
                                                                <span style={{ marginLeft: 8, color: '#999' }}>
                                                                    {item.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    }
                                                />
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* 购物车内容 */}
                {cart.size > 0 && (
                    <div style={{ marginTop: 24, borderTop: '1px solid #333', paddingTop: 16 }}>
                        <h4 style={{ marginBottom: 12 }}>已选商品</h4>
                        <List
                            size="small"
                            dataSource={Array.from(cart.values())}
                            renderItem={(cartItem) => (
                                <List.Item
                                    actions={[
                                        <span>x{cartItem.quantity}</span>,
                                        <span style={{ color: '#d4a84b' }}>
                                            ¥{(cartItem.item.price * cartItem.quantity).toFixed(2)}
                                        </span>,
                                    ]}
                                >
                                    {cartItem.item.name}
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Drawer>
        </div>
    );
}
