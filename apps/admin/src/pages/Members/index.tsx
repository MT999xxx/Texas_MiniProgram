import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, InputNumber, App } from 'antd';
import { ReloadOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memberApi, Member } from '../../api/members';
import './Members.css';

export default function Members() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const data = await memberApi.list();
            setMembers(data);
        } catch (error) {
            message.error('加载会员列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustPoints = (member: Member, isAdd: boolean) => {
        let delta = 0;
        modal.confirm({
            title: isAdd ? '增加积分' : '扣除积分',
            content: (
                <div>
                    <p>会员：{member.nickname}</p>
                    <p>当前积分：{member.points}</p>
                    <p>{isAdd ? '增加' : '扣除'}：
                        <InputNumber
                            min={0}
                            defaultValue={0}
                            onChange={(value) => delta = value || 0}
                        />
                    </p>
                </div>
            ),
            onOk: async () => {
                try {
                    await memberApi.adjustPoints(member.id, isAdd ? delta : -delta);
                    message.success('积分调整成功');
                    loadMembers();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    const handleAdjustCoins = (member: Member, isAdd: boolean) => {
        let delta = 0;
        modal.confirm({
            title: isAdd ? '增加金币' : '扣除金币',
            content: (
                <div>
                    <p>会员：{member.nickname}</p>
                    <p>当前金币：{member.coins ? Number(member.coins).toFixed(2) : '0.00'}</p>
                    <p>{isAdd ? '增加' : '扣除'}：
                        <InputNumber
                            min={0}
                            precision={2}
                            defaultValue={0}
                            onChange={(value) => delta = value || 0}
                        />
                    </p>
                </div>
            ),
            onOk: async () => {
                try {
                    await memberApi.adjustCoins(member.id, isAdd ? delta : -delta);
                    message.success('金币调整成功');
                    loadMembers();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    const columns: ColumnsType<Member> = [
        {
            title: '昵称',
            dataIndex: 'nickname',
            key: 'nickname',
        },
        {
            title: '联系方式',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: '会员等级',
            key: 'level',
            render: (record: Member) => (
                <Tag color="blue">
                    {record.level?.name || '-'}
                </Tag>
            ),
        },
        {
            title: '积分',
            dataIndex: 'points',
            key: 'points',
            render: (points: number) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {points}
                </span>
            ),
        },
        {
            title: '金币',
            dataIndex: 'coins',
            key: 'coins',
            render: (coins: number) => (
                <span style={{ fontWeight: 'bold', color: '#faad14' }}>
                    {coins ? Number(coins).toFixed(2) : '0.00'}
                </span>
            ),
        },
        {
            title: '累计消费',
            dataIndex: 'totalSpent',
            key: 'totalSpent',
            render: (amount: number | string) => `¥${amount ? Number(amount).toFixed(2) : '0.00'}`,
        },
        {
            title: '注册时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
        },
        {
            title: '操作',
            key: 'action',
            width: 320,
            render: (record: Member) => (
                <Space wrap>
                    <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleAdjustPoints(record, true)}
                    >
                        积分+
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => handleAdjustPoints(record, false)}
                    >
                        积分-
                    </Button>
                    <Button
                        size="small"
                        style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}
                        icon={<PlusOutlined />}
                        onClick={() => handleAdjustCoins(record, true)}
                    >
                        金币+
                    </Button>
                    <Button
                        size="small"
                        style={{ background: '#ff7a45', borderColor: '#ff7a45', color: '#fff' }}
                        icon={<MinusOutlined />}
                        onClick={() => handleAdjustCoins(record, false)}
                    >
                        金币-
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="members-page">
            <Card variant="borderless">
                <div className="toolbar">
                    <Button icon={<ReloadOutlined />} onClick={loadMembers}>
                        刷新
                    </Button>
                </div>

                <Table
                    loading={loading}
                    dataSource={members}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 个会员`,
                    }}
                />
            </Card>
        </div>
    );
}
