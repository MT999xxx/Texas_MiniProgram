import { useState } from 'react';
import { Badge, Dropdown, List, Avatar, Button, Empty, Tabs } from 'antd';
import { BellOutlined, CheckOutlined, ClockCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import './NotificationCenter.css';

interface Notification {
    id: string;
    type: 'reservation' | 'order' | 'system' | 'warning';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

const mockNotifications: Notification[] = [
    { id: '1', type: 'reservation', title: '新预约', description: 'Husk·Aiden 预约了主赛桌 A1', time: '2分钟前', read: false },
    { id: '2', type: 'order', title: '新订单', description: '副赛桌 B2 下单了 3 件商品', time: '5分钟前', read: false },
    { id: '3', type: 'warning', title: '桌位预警', description: '练习桌已满座，排队人数达到 5 人', time: '10分钟前', read: false },
    { id: '4', type: 'system', title: '系统通知', description: '会员等级规则已更新', time: '1小时前', read: true },
    { id: '5', type: 'reservation', title: '预约提醒', description: '15分钟后有 3 位客人到店', time: '1小时前', read: true },
];

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [open, setOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'reservation': return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
            case 'order': return <CheckOutlined style={{ color: '#52c41a' }} />;
            case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'system': return <InfoCircleOutlined style={{ color: '#722ed1' }} />;
            default: return <BellOutlined />;
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const content = (
        <div className="notification-dropdown">
            <div className="notification-header">
                <span className="notification-title">
                    通知中心 {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 8 }} />}
                </span>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={markAllAsRead}>
                        全部已读
                    </Button>
                )}
            </div>

            <Tabs
                defaultActiveKey="all"
                centered
                items={[
                    {
                        key: 'all',
                        label: '全部',
                        children: (
                            <List
                                className="notification-list"
                                dataSource={notifications}
                                renderItem={(item) => (
                                    <List.Item
                                        className={`notification-item ${!item.read ? 'unread' : ''}`}
                                        onClick={() => markAsRead(item.id)}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar icon={getIcon(item.type)} style={{ background: 'transparent' }} />}
                                            title={item.title}
                                            description={
                                                <div>
                                                    <div className="notification-desc">{item.description}</div>
                                                    <div className="notification-time">{item.time}</div>
                                                </div>
                                            }
                                        />
                                        {!item.read && <div className="unread-dot" />}
                                    </List.Item>
                                )}
                                locale={{ emptyText: <Empty description="暂无通知" /> }}
                            />
                        ),
                    },
                    {
                        key: 'unread',
                        label: `未读 (${unreadCount})`,
                        children: (
                            <List
                                className="notification-list"
                                dataSource={notifications.filter(n => !n.read)}
                                renderItem={(item) => (
                                    <List.Item
                                        className="notification-item unread"
                                        onClick={() => markAsRead(item.id)}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar icon={getIcon(item.type)} style={{ background: 'transparent' }} />}
                                            title={item.title}
                                            description={
                                                <div>
                                                    <div className="notification-desc">{item.description}</div>
                                                    <div className="notification-time">{item.time}</div>
                                                </div>
                                            }
                                        />
                                        <div className="unread-dot" />
                                    </List.Item>
                                )}
                                locale={{ emptyText: <Empty description="没有未读消息" /> }}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );

    return (
        <Dropdown
            dropdownRender={() => content}
            trigger={['click']}
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
        >
            <div className="notification-trigger">
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                    <BellOutlined className="notification-icon" />
                </Badge>
            </div>
        </Dropdown>
    );
}
