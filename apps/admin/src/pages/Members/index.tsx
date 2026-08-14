import { useState, useEffect, useMemo } from 'react';
import { Table, Card, Button, Space, Tag, InputNumber, App, Avatar, Select, Input } from 'antd';
import { ReloadOutlined, PlusOutlined, MinusOutlined, UserOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memberApi, Member } from '../../api/members';
import './Members.css';

export default function Members() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [searchText, setSearchText] = useState('');

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
        } finally {
            setLoading(false);
        }
    };

    interface Level {
        code: string;
        name: string;
        threshold: number;
    }
    const [levels, setLevels] = useState<Level[]>([]);

    const loadLevels = async () => {
        try {
            const data = await memberApi.listLevels();
            setLevels(data);
        } catch (error) {
            console.error('加载等级列表失败');
        }
    };

    // 根据搜索关键词过滤会员列表
    const filteredMembers = useMemo(() => {
        if (!searchText.trim()) return members;
        const keyword = searchText.toLowerCase().trim();
        return members.filter(m =>
            m.nickname?.toLowerCase().includes(keyword) ||
            m.phone?.includes(keyword)
        );
    }, [members, searchText]);

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

    const handleAdjustWineVouchers = (member: Member, isAdd: boolean) => {
        let delta = 0;
        modal.confirm({
            title: isAdd ? '增加酒卷' : '扣除酒卷',
            content: (
                <div>
                    <p>会员：{member.nickname}</p>
                    <p>当前酒卷：{(member as any).wineVouchers ?? 0}张</p>
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
                    await memberApi.adjustWineVouchers(member.id, isAdd ? delta : -delta);
                    message.success('酒卷调整成功');
                    loadMembers();
                } catch (error) {
                    message.error('操作失败');
                }
            },
        });
    };

    const handleChangeLevel = (member: Member) => {
        let selectedLevel: string | null = member.levelCode || null;
        modal.confirm({
            title: '修改会员等级',
            content: (
                <div>
                    <p>会员：{member.nickname}</p>
                    <p>当前等级：{member.level?.name || '无'}</p>
                    <p>选择新等级：
                        <Select
                            style={{ width: 150 }}
                            defaultValue={member.levelCode || undefined}
                            allowClear
                            placeholder="选择等级"
                            onChange={(value) => selectedLevel = value || null}
                        >
                            {levels.map(level => (
                                <Select.Option key={level.code} value={level.code}>
                                    {level.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </p>
                </div>
            ),
            onOk: async () => {
                try {
                    await memberApi.updateLevel(member.id, selectedLevel);
                    message.success('等级修改成功');
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
            title: '头像',
            dataIndex: 'avatar',
            key: 'avatar',
            width: 70,
            render: (avatar: string) => (
                <Avatar
                    size={40}
                    src={avatar && avatar.startsWith('https://') ? avatar : undefined}
                    icon={<UserOutlined />}
                    style={{ border: '2px solid #d4a84b' }}
                />
            ),
        },
        {
            title: '会员等级',
            key: 'level',
            render: (record: Member) => (
                <Tag
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleChangeLevel(record)}
                >
                    {record.level?.name || '-'} <EditOutlined />
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
            title: '酒卷',
            dataIndex: 'wineVouchers',
            key: 'wineVouchers',
            render: (v: number) => (
                <span style={{ fontWeight: 'bold', color: '#722ed1' }}>
                    {v ?? 0}张
                </span>
            ),
        },
        {
            title: '累计充值',
            dataIndex: 'totalRechargeAmount',
            key: 'totalRechargeAmount',
            render: (amount: number | string) => `¥${amount ? Number(amount).toFixed(2) : '0.00'}`,
        },
        {
            title: '月赛门票',
            dataIndex: 'monthlyTickets',
            key: 'monthlyTickets',
            render: (value: number) => `${value || 0}张`,
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
                    <Button
                        size="small"
                        style={{ background: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
                        icon={<PlusOutlined />}
                        onClick={() => handleAdjustWineVouchers(record, true)}
                    >
                        酒卷+
                    </Button>
                    <Button
                        size="small"
                        style={{ background: '#531dab', borderColor: '#531dab', color: '#fff' }}
                        icon={<MinusOutlined />}
                        onClick={() => handleAdjustWineVouchers(record, false)}
                    >
                        酒卷-
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
                    <Input.Search
                        placeholder="搜索会员昵称或手机号"
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ width: 280 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onSearch={(value) => setSearchText(value)}
                    />
                </div>

                <Table
                    loading={loading}
                    dataSource={filteredMembers}
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
