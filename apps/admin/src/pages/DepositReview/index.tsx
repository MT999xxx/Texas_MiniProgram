import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Input, App, Select } from 'antd';
import { ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { memberApi, PointDeposit } from '../../api/members';
import './DepositReview.css';

const { TextArea } = Input;

export default function DepositReview() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [deposits, setDeposits] = useState<PointDeposit[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [currentDeposit, setCurrentDeposit] = useState<PointDeposit | null>(null);
    const [reviewRemark, setReviewRemark] = useState('');

    useEffect(() => {
        loadDeposits();
    }, [statusFilter]);

    const loadDeposits = async () => {
        setLoading(true);
        try {
            const data = await memberApi.getDepositRequests(statusFilter || undefined);
            setDeposits(data);
        } catch (error) {
            message.error('加载申请列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (deposit: PointDeposit, approve: boolean) => {
        setCurrentDeposit(deposit);
        setReviewRemark('');

        if (approve) {
            modal.confirm({
                title: '确认通过',
                content: (
                    <div>
                        <p>会员：{deposit.member?.nickname || deposit.memberId}</p>
                        <p>申请积分：{deposit.points}</p>
                        <p>实际存入积分：{deposit.actualPoints}</p>
                    </div>
                ),
                okText: '通过',
                okType: 'primary',
                onOk: async () => {
                    try {
                        await memberApi.reviewDeposit(deposit.id, 'APPROVED');
                        message.success('审核通过');
                        loadDeposits();
                    } catch (error) {
                        message.error('操作失败');
                    }
                },
            });
        } else {
            setReviewModalVisible(true);
        }
    };

    const handleReject = async () => {
        if (!currentDeposit) return;
        try {
            await memberApi.reviewDeposit(currentDeposit.id, 'REJECTED', reviewRemark);
            message.success('已拒绝');
            setReviewModalVisible(false);
            loadDeposits();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Tag color="orange">待审核</Tag>;
            case 'APPROVED':
                return <Tag color="green">已通过</Tag>;
            case 'REJECTED':
                return <Tag color="red">已拒绝</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns: ColumnsType<PointDeposit> = [
        {
            title: '会员',
            key: 'member',
            render: (record: PointDeposit) => record.member?.nickname || record.memberId,
        },
        {
            title: '申请积分',
            dataIndex: 'points',
            key: 'points',
            render: (points: number) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{points}</span>
            ),
        },
        {
            title: '实际存入',
            dataIndex: 'actualPoints',
            key: 'actualPoints',
            render: (points: number) => (
                <span style={{ color: '#52c41a' }}>{points || 0}</span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => getStatusTag(status),
        },
        {
            title: '申请时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString('zh-CN'),
        },
        {
            title: '审核时间',
            dataIndex: 'reviewedAt',
            key: 'reviewedAt',
            render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
        },
        {
            title: '操作',
            key: 'action',
            render: (record: PointDeposit) => (
                record.status === 'PENDING' ? (
                    <Space>
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleReview(record, true)}
                        >
                            通过
                        </Button>
                        <Button
                            size="small"
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => handleReview(record, false)}
                        >
                            拒绝
                        </Button>
                    </Space>
                ) : (
                    <span style={{ color: '#999' }}>已处理</span>
                )
            ),
        },
    ];

    return (
        <div className="deposit-review-page">
            <Card variant="borderless">
                <div className="toolbar">
                    <Space>
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 120 }}
                            options={[
                                { value: '', label: '全部' },
                                { value: 'PENDING', label: '待审核' },
                                { value: 'APPROVED', label: '已通过' },
                                { value: 'REJECTED', label: '已拒绝' },
                            ]}
                        />
                        <Button icon={<ReloadOutlined />} onClick={loadDeposits}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Table
                    loading={loading}
                    dataSource={deposits}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `共 ${total} 条申请`,
                    }}
                />
            </Card>

            <Modal
                title="拒绝申请"
                open={reviewModalVisible}
                onOk={handleReject}
                onCancel={() => setReviewModalVisible(false)}
                okText="确认拒绝"
                okButtonProps={{ danger: true }}
            >
                <p>会员：{currentDeposit?.member?.nickname || currentDeposit?.memberId}</p>
                <p>申请积分：{currentDeposit?.points}</p>
                <TextArea
                    placeholder="请输入拒绝原因（可选）"
                    value={reviewRemark}
                    onChange={(e) => setReviewRemark(e.target.value)}
                    rows={3}
                />
            </Modal>
        </div>
    );
}
