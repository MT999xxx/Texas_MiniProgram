import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, Form, Input, InputNumber, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memberApi, Member, MemberLevel, CreateMemberDto } from '../../api/members';
import './Members.css';

export default function Members() {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [levels, setLevels] = useState<MemberLevel[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [adjustingMember, setAdjustingMember] = useState<Member | null>(null);
    const [form] = Form.useForm();
    const [pointsForm] = Form.useForm();

    useEffect(() => {
        loadMembers();
        loadLevels();
    }, []);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const data = await memberApi.list();
            setMembers(data);
        } catch (error) {
            message.error('加载会员列表失败');
            console.error('加载错误:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLevels = async () => {
        try {
            const data = await memberApi.listLevels();
            setLevels(data);
        } catch (error) {
            console.error('加载等级失败:', error);
        }
    };

    // 打开新增/编辑弹窗
    const openModal = (member?: Member) => {
        setEditingMember(member || null);
        if (member) {
            form.setFieldsValue({
                userId: member.userId,
                nickname: member.nickname,
                phone: member.phone,
                levelCode: member.levelCode,
            });
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingMember(null);
        form.resetFields();
    };

    // 提交表单
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingMember) {
                await memberApi.update(editingMember.id, values);
                message.success('会员更新成功');
            } else {
                await memberApi.create(values as CreateMemberDto);
                message.success('会员创建成功');
            }
            closeModal();
            loadMembers();
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 打开积分调整弹窗
    const openPointsModal = (member: Member) => {
        setAdjustingMember(member);
        pointsForm.resetFields();
        setIsPointsModalOpen(true);
    };

    // 积分调整
    const handleAdjustPoints = async () => {
        try {
            const values = await pointsForm.validateFields();
            if (adjustingMember) {
                await memberApi.adjustPoints(adjustingMember.id, values.delta);
                message.success('积分调整成功');
                setIsPointsModalOpen(false);
                setAdjustingMember(null);
                pointsForm.resetFields();
                loadMembers();
            }
        } catch (error) {
            message.error('操作失败');
        }
    };

    const columns: ColumnsType<Member> = [
        {
            title: '昵称',
            dataIndex: 'nickname',
            key: 'nickname',
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: '用户ID',
            dataIndex: 'userId',
            key: 'userId',
        },
        {
            title: '会员等级',
            key: 'level',
            render: (_, record) => record.level?.name || '普通会员',
        },
        {
            title: '积分',
            dataIndex: 'points',
            key: 'points',
            render: (points) => (
                <Tag color={points > 1000 ? 'gold' : points > 500 ? 'blue' : 'default'}>
                    {points}
                </Tag>
            ),
        },
        {
            title: '注册时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => new Date(text).toLocaleDateString('zh-CN'),
        },
        {
            title: '操作',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        size="small"
                        onClick={() => openPointsModal(record)}
                    >
                        调整积分
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openModal(record)}
                    >
                        编辑
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="members-page">
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            新增会员
                        </Button>

                        <Button icon={<ReloadOutlined />} onClick={loadMembers}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={members}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* 新增/编辑会员弹窗 */}
            <Modal
                title={editingMember ? '编辑会员' : '新增会员'}
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
                        label="用户ID"
                        name="userId"
                        rules={[{ required: true, message: '请输入用户ID' }]}
                    >
                        <Input placeholder="请输入用户ID" disabled={!!editingMember} />
                    </Form.Item>

                    <Form.Item
                        label="昵称"
                        name="nickname"
                        rules={[{ required: true, message: '请输入昵称' }]}
                    >
                        <Input placeholder="请输入昵称" />
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
                        label="会员等级"
                        name="levelCode"
                    >
                        <Select placeholder="请选择会员等级（可选）" allowClear>
                            {levels.map(level => (
                                <Select.Option key={level.code} value={level.code}>
                                    {level.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {!editingMember && (
                        <Form.Item
                            label="初始积分"
                            name="points"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="默认为0" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* 积分调整弹窗 */}
            <Modal
                title="调整积分"
                open={isPointsModalOpen}
                onOk={handleAdjustPoints}
                onCancel={() => {
                    setIsPointsModalOpen(false);
                    setAdjustingMember(null);
                    pointsForm.resetFields();
                }}
                okText="确定"
                cancelText="取消"
            >
                <div style={{ marginBottom: 16 }}>
                    <p>会员：{adjustingMember?.nickname}</p>
                    <p>当前积分：{adjustingMember?.points}</p>
                </div>
                <Form
                    form={pointsForm}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label="积分变动"
                        name="delta"
                        rules={[{ required: true, message: '请输入积分变动值' }]}
                        extra="正数为增加，负数为减少"
                    >
                        <InputNumber style={{ width: '100%' }} placeholder="例如：100 或 -50" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
