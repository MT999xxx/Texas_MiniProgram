import { useState, useEffect } from 'react';
import { Table, Card, Button, Select, Tag, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { transactionApi, Transaction } from '../../api/transactions';
import './Transactions.css';

const TYPE_LABELS: Record<string, string> = {
    RECHARGE: '充值',
    EXCHANGE: '积分兑换',
    CONSUME: '消费',
    WITHDRAW: '取积分',
};

const TYPE_OPTIONS = [
    { value: '', label: '全部类型' },
    { value: 'RECHARGE', label: '充值' },
    { value: 'EXCHANGE', label: '积分兑换' },
    { value: 'WITHDRAW', label: '取积分' },
    { value: 'CONSUME', label: '消费' },
];

export default function Transactions() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        loadTransactions();
    }, [typeFilter]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await transactionApi.list(typeFilter || undefined);
            setTransactions(data);
        } catch (error) {
            message.error('加载交易记录失败');
        } finally {
            setLoading(false);
        }
    };

    // 统计数据
    const stats = {
        total: transactions.length,
        exchange: transactions.filter(t => t.type === 'EXCHANGE').length,
        withdraw: transactions.filter(t => t.type === 'WITHDRAW').length,
        recharge: transactions.filter(t => t.type === 'RECHARGE').length,
    };

    const columns: ColumnsType<Transaction> = [
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: string) => (
                <Tag className={`type-tag type-${type}`}>
                    {TYPE_LABELS[type] || type}
                </Tag>
            ),
        },
        {
            title: '会员',
            key: 'member',
            render: (record: Transaction) => (
                <span>{record.member?.nickname || record.member?.phone || '-'}</span>
            ),
        },
        {
            title: '金币',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => (
                <span style={{ color: '#faad14', fontWeight: 500 }}>
                    {amount ? Number(amount).toFixed(2) : '-'}
                </span>
            ),
        },
        {
            title: '积分',
            dataIndex: 'pointsUsed',
            key: 'pointsUsed',
            render: (points: number) => (
                <span style={{ color: '#1890ff', fontWeight: 500 }}>
                    {points || '-'}
                </span>
            ),
        },
        {
            title: '支付金额',
            dataIndex: 'paymentAmount',
            key: 'paymentAmount',
            render: (amount: number) => amount ? `¥${Number(amount).toFixed(2)}` : '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'SUCCESS' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
                    {status === 'SUCCESS' ? '成功' : status === 'PENDING' ? '待处理' : '失败'}
                </Tag>
            ),
        },
        {
            title: '备注',
            dataIndex: 'remark',
            key: 'remark',
            ellipsis: true,
        },
        {
            title: '时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        },
    ];

    return (
        <div className="transactions-page">
            <Card variant="borderless">
                {/* 统计卡片 */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="label">总记录</div>
                        <div className="value">{stats.total}</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">积分兑换</div>
                        <div className="value">{stats.exchange}</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">取积分</div>
                        <div className="value">{stats.withdraw}</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">充值</div>
                        <div className="value">{stats.recharge}</div>
                    </div>
                </div>

                {/* 工具栏 */}
                <div className="toolbar">
                    <Select
                        style={{ width: 160 }}
                        value={typeFilter}
                        options={TYPE_OPTIONS}
                        onChange={setTypeFilter}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadTransactions}>
                        刷新
                    </Button>
                </div>

                {/* 表格 */}
                <Table
                    loading={loading}
                    dataSource={transactions}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 15,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                />
            </Card>
        </div>
    );
}
