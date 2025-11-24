import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, InputNumber, Select } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { menuApi, MenuItem, MenuCategory } from '../../api/menu';
import './Menu.css';

export default function Menu() {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>();

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
            const data = await menuApi.listItems(categoryFilter);
            setItems(data);
        } catch (error) {
            message.error('加载菜品失败');
        } finally {
            setLoading(false);
        }
    };

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
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '分类',
            key: 'category',
            render: (record: MenuItem) => record.category?.name || '-',
        },
        {
            title: '价格',
            dataIndex: 'price',
            key: 'price',
            render: (price: number) => `¥${price.toFixed(2)}`,
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
            dataIndex: 'isAvailable',
            key: 'isAvailable',
            render: (isAvailable: boolean) => (
                <Tag color={isAvailable ? 'green' : 'red'}>
                    {isAvailable ? '可用' : '停售'}
                </Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            render: (record: MenuItem) => (
                <Space>
                    <Button size="small" onClick={() => handleUpdateStock(record)}>
                        更新库存
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="menu-page">
            <Card>
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
                    loading={loading}
                    dataSource={items}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
                />
            </Card>
        </div>
    );
}
