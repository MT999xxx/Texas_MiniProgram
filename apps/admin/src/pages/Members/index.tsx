import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, message, Modal, InputNumber } from 'antd';
import { ReloadOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memberApi, Member } from '../../api/members';
import './Members.css';

export default function Members() {
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
        Modal.confirm({
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
            title: '累计消费',
            dataIndex: 'totalSpent',
            key: 'totalSpent',
            render: (amount: number) => `¥${amount?.toFixed(2) || '0.00'}`,
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
            render: (record: Member) => (
                <Space>
                    <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleAdjustPoints(record, true)}
                    >
                        增加积分
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => handleAdjustPoints(record, false)}
                    >
                        扣除积分
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="members-page">
            <Card>
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
