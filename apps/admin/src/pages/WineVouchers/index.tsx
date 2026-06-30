import { useEffect, useMemo, useState } from 'react';
import {
    App,
    Button,
    Card,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Table,
    Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { menuApi, MenuItem } from '../../api/menu';
import {
    SaveWineVoucherOptionDto,
    wineVoucherOptionsApi,
    WineVoucherOption,
} from '../../api/wineVoucherOptions';
import './WineVouchers.css';

const voucherPackageOptions = [
    { label: '通用酒券', value: '' },
    { label: '月赛畅饮券', value: 'monthly-free-flow' },
    { label: 'SNG酒券套餐', value: 'sng-wine-set' },
    { label: '百威啤酒2瓶', value: 'budweiser-duo' },
    { label: '鸡尾酒一杯', value: 'cocktail-single' },
];

const specOptions = [
    { label: '单品', value: 'single' },
    { label: '半打', value: 'half_dozen' },
    { label: '一打', value: 'dozen' },
];

export default function WineVouchers() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<WineVoucherOption[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<WineVoucherOption | null>(null);
    const [form] = Form.useForm<SaveWineVoucherOptionDto>();

    const menuItemOptions = useMemo(() => menuItems.map(item => ({
        label: `${item.name} / ¥${Number(item.price).toFixed(2)} / 库存 ${item.stock}`,
        value: item.id,
    })), [menuItems]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [optionData, itemData] = await Promise.all([
                wineVoucherOptionsApi.listAdmin(),
                menuApi.listItems(),
            ]);
            setOptions(optionData);
            setMenuItems(itemData);
        } catch (error) {
            message.error('加载酒券配置失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            requiredVoucherCount: 1,
            isActive: true,
            sortOrder: 0,
            items: [{ menuItemId: '', quantity: 1, specType: 'single' }],
        });
        setModalVisible(true);
    };

    const openEdit = (option: WineVoucherOption) => {
        setEditing(option);
        form.setFieldsValue({
            name: option.name,
            description: option.description,
            voucherPackageId: option.voucherPackageId || '',
            requiredVoucherCount: option.requiredVoucherCount,
            isActive: option.isActive,
            sortOrder: option.sortOrder,
            items: (option.items || []).map(item => ({
                menuItemId: item.menuItemId || item.menuItem?.id || '',
                quantity: item.quantity || 1,
                specType: item.specType || 'single',
            })),
        });
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        const values = await form.validateFields();
        const payload: SaveWineVoucherOptionDto = {
            ...values,
            voucherPackageId: values.voucherPackageId || undefined,
            items: values.items.map(item => ({
                menuItemId: item.menuItemId,
                quantity: Number(item.quantity || 1),
                specType: item.specType || 'single',
            })),
        };

        if (editing) {
            await wineVoucherOptionsApi.update(editing.id, payload);
            message.success('酒券配置已更新');
        } else {
            await wineVoucherOptionsApi.create(payload);
            message.success('酒券配置已创建');
        }
        setModalVisible(false);
        loadData();
    };

    const handleDisable = async (option: WineVoucherOption) => {
        await wineVoucherOptionsApi.disable(option.id);
        message.success('已停用兑换项目');
        loadData();
    };

    const columns: ColumnsType<WineVoucherOption> = [
        {
            title: '兑换项目',
            dataIndex: 'name',
            render: (_: string, record) => (
                <div>
                    <div className="voucher-option-name">{record.name}</div>
                    <div className="voucher-option-desc">{record.description || '未填写说明'}</div>
                </div>
            ),
        },
        {
            title: '适用酒券',
            dataIndex: 'voucherPackageId',
            render: (value?: string) => {
                const option = voucherPackageOptions.find(item => item.value === (value || ''));
                return option?.label || value || '通用酒券';
            },
        },
        {
            title: '兑换内容',
            dataIndex: 'items',
            render: (items: WineVoucherOption['items']) => (
                <Space wrap>
                    {(items || []).map(item => (
                        <Tag key={item.id || item.menuItemId} color="gold">
                            {item.menuItem?.name || item.menuItemId} x {item.quantity}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '消耗',
            dataIndex: 'requiredVoucherCount',
            width: 90,
            render: (count: number) => `${count || 1} 张`,
        },
        {
            title: '状态',
            dataIndex: 'isActive',
            width: 90,
            render: (active: boolean) => <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
                    <Popconfirm title="确认停用该兑换项目？" onConfirm={() => handleDisable(record)}>
                        <Button size="small" danger disabled={!record.isActive}>停用</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="wine-voucher-page">
            <Card
                title="酒券兑换配置"
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增兑换项目</Button>}
            >
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={options}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editing ? '编辑兑换项目' : '新增兑换项目'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                okText="保存"
                cancelText="取消"
                width={760}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="兑换项目名称" rules={[{ required: true, message: '请输入名称' }]}>
                        <Input placeholder="例如：百威啤酒2瓶" />
                    </Form.Item>
                    <Form.Item name="description" label="说明">
                        <Input placeholder="展示给顾客的简短说明" />
                    </Form.Item>
                    <Space size="large" align="start">
                        <Form.Item name="voucherPackageId" label="适用酒券" style={{ width: 220 }}>
                            <Select options={voucherPackageOptions} />
                        </Form.Item>
                        <Form.Item name="requiredVoucherCount" label="消耗张数" rules={[{ required: true }]}>
                            <InputNumber min={1} />
                        </Form.Item>
                        <Form.Item name="sortOrder" label="排序">
                            <InputNumber />
                        </Form.Item>
                        <Form.Item name="isActive" label="启用" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <div>
                                <div className="voucher-items-title">兑换酒品</div>
                                {fields.map(field => (
                                    <Space key={field.key} className="voucher-item-row" align="baseline">
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'menuItemId']}
                                            rules={[{ required: true, message: '请选择酒品' }]}
                                        >
                                            <Select
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="选择菜单商品"
                                                options={menuItemOptions}
                                                style={{ width: 330 }}
                                            />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'quantity']}>
                                            <InputNumber min={1} placeholder="数量" />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, 'specType']}>
                                            <Select options={specOptions} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)} disabled={fields.length <= 1}>
                                            删除
                                        </Button>
                                    </Space>
                                ))}
                                <Button onClick={() => add({ quantity: 1, specType: 'single' })}>添加酒品</Button>
                            </div>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </div>
    );
}

