import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Select, message, Space, Modal } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { tableApi, Table } from '../../api/tables';
import './Tables.css';

export default function Tables() {
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();

    // 加载桌位列表
    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await tableApi.list({
                category: categoryFilter,
                status: statusFilter,
            });
            setTables(data);
        } catch (error) {
            console.error('加载桌位列表失败:', error);
            message.error('加载桌位列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTables();
    }, [categoryFilter, statusFilter]);

    // 更新桌位状态
    const handleUpdateStatus = async (id: string, status: string) => {
        Modal.confirm({
            title: '确认更新状态',
            content: `是否将桌位状态更新为：${getStatusText(status)}？`,
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
            MAIN: '主赛桌',
            SIDE: '副赛桌',
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

    // 状态操作按钮
    const getStatusActions = (table: Table) => {
        const actions = [];

        if (table.status !== 'AVAILABLE') {
            actions.push(
                <Button
                    key="available"
                    size="small"
                    onClick={() => handleUpdateStatus(table.id, 'AVAILABLE')}
                >
                    设为空闲
                </Button>
            );
        }

        if (table.status !== 'IN_USE') {
            actions.push(
                <Button
                    key="in_use"
                    size="small"
                    type="primary"
                    onClick={() => handleUpdateStatus(table.id, 'IN_USE')}
                >
                    设为使用中
                </Button>
            );
        }

        if (table.status !== 'MAINTENANCE') {
            actions.push(
                <Button
                    key="maintenance"
                    size="small"
                    danger
                    onClick={() => handleUpdateStatus(table.id, 'MAINTENANCE')}
                >
                    维护中
                </Button>
            );
        }

        return actions;
    };

    return (
        <div className="tables-page">
            <Card>
                <div className="toolbar">
                    <Space size="middle">
                        <Select
                            placeholder="类别筛选"
                            style={{ width: 150 }}
                            allowClear
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        >
                            <Select.Option value="MAIN">主赛桌</Select.Option>
                            <Select.Option value="SIDE">副赛桌</Select.Option>
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

                        <Button icon={<ReloadOutlined />} onClick={loadTables}>
                            刷新
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    {tables.map((table) => (
                        <Col key={table.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                className={`table-card status-${table.status.toLowerCase()}`}
                                size="small"
                                loading={loading}
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
                                        {getStatusActions(table)}
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {tables.length === 0 && !loading && (
                    <div className="empty-state">
                        <p>暂无桌位数据</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
