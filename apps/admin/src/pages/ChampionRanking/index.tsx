import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Select, App, Avatar, InputNumber, Segmented, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined, ArrowUpOutlined, ArrowDownOutlined, SaveOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { championApi, ChampionEntry } from '../../api/champion';
import { memberApi, Member } from '../../api/members';

type ChampionType = 'champion_weekly' | 'champion_monthly';

export default function ChampionRanking() {
    const { message, modal } = App.useApp();
    const [type, setType] = useState<ChampionType>('champion_weekly');
    const [rankings, setRankings] = useState<ChampionEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);

    useEffect(() => { loadRankings(); }, [type]);
    useEffect(() => { loadMembers(); }, []);

    /** 加载当前榜单 */
    const loadRankings = async () => {
        setLoading(true);
        try {
            const data = await championApi.getList(type);
            setRankings(data);
        } catch { message.error('加载排名失败'); }
        finally { setLoading(false); }
    };

    /** 加载全部会员（用于添加下拉框） */
    const loadMembers = async () => {
        try { setMembers(await memberApi.list()); }
        catch { console.error('加载会员列表失败'); }
    };

    /** 批量保存排名 */
    const handleSave = async () => {
        setSaving(true);
        try {
            const entries = rankings.map((r, i) => ({ memberId: r.id, rank: i + 1 }));
            await championApi.save(type, entries);
            message.success('排名保存成功');
            loadRankings();
        } catch { message.error('保存失败'); }
        finally { setSaving(false); }
    };

    /** 添加会员到榜单 */
    const handleAdd = () => {
        const existIds = new Set(rankings.map(r => r.id));
        const availableMembers = members.filter(m => !existIds.has(m.id));
        let selectedId = '';

        modal.confirm({
            title: '添加会员到排名',
            content: (
                <div>
                    <p>选择会员：</p>
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="搜索会员昵称或手机号"
                        optionFilterProp="label"
                        onChange={(v: string) => selectedId = v}
                        options={availableMembers.map(m => ({
                            value: m.id,
                            label: `${m.nickname || '无昵称'} (${m.phone})`,
                        }))}
                    />
                </div>
            ),
            onOk: () => {
                if (!selectedId) { message.warning('请选择会员'); return; }
                const member = members.find(m => m.id === selectedId);
                if (!member) return;
                setRankings(prev => [...prev, {
                    rank: prev.length + 1,
                    id: member.id,
                    nickname: member.nickname || '无昵称',
                    avatar: member.avatar,
                    points: member.points,
                    levelCode: member.levelCode || 'V1',
                    levelName: member.level ? `${member.level.code}${member.level.name}` : 'V1',
                }]);
            },
        });
    };

    /** 移除排名 */
    const handleRemove = (id: string) => {
        setRankings(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, rank: i + 1 })));
    };

    /** 上移 */
    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        setRankings(prev => {
            const arr = [...prev];
            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
            return arr.map((r, i) => ({ ...r, rank: i + 1 }));
        });
    };

    /** 下移 */
    const handleMoveDown = (index: number) => {
        if (index >= rankings.length - 1) return;
        setRankings(prev => {
            const arr = [...prev];
            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
            return arr.map((r, i) => ({ ...r, rank: i + 1 }));
        });
    };

    const columns: ColumnsType<ChampionEntry> = [
        {
            title: '排名', dataIndex: 'rank', key: 'rank', width: 80,
            render: (_, __, i) => <span style={{ fontSize: 20, fontWeight: 'bold', color: i < 3 ? '#d4a84b' : '#ccc' }}>{i + 1}</span>,
        },
        {
            title: '头像', dataIndex: 'avatar', key: 'avatar', width: 60,
            render: (avatar: string) => <Avatar size={36} src={avatar?.startsWith('https://') ? avatar : undefined} icon={<UserOutlined />} />,
        },
        { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
        { title: '等级', dataIndex: 'levelName', key: 'levelName', width: 120 },
        {
            title: '操作', key: 'action', width: 180,
            render: (_, record, index) => (
                <Space>
                    <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => handleMoveUp(index)} />
                    <Button size="small" icon={<ArrowDownOutlined />} disabled={index === rankings.length - 1} onClick={() => handleMoveDown(index)} />
                    <Popconfirm title="确认移除？" onConfirm={() => handleRemove(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 0 }}>
            <Card
                variant="borderless"
                title={
                    <Segmented
                        value={type}
                        onChange={(v) => setType(v as ChampionType)}
                        options={[
                            { label: '冠军赛周榜', value: 'champion_weekly' },
                            { label: '冠军赛月榜', value: 'champion_monthly' },
                        ]}
                    />
                }
                extra={
                    <Space>
                        <Button icon={<PlusOutlined />} onClick={handleAdd}>添加会员</Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存排名</Button>
                    </Space>
                }
            >
                <Table
                    loading={loading}
                    dataSource={rankings}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: '暂无排名数据，点击「添加会员」开始' }}
                />
            </Card>
        </div>
    );
}
