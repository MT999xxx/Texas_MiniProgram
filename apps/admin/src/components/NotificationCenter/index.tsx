import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Dropdown, List, Avatar, Button, Empty, Tabs, notification } from 'antd';
import {
    BellOutlined,
    CheckOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { adminNotificationsApi, AdminNotification } from '../../api/adminNotifications';
import './NotificationCenter.css';

const SHOWN_POPUP_STORAGE_KEY = 'setbar-admin-shown-popup-notification-ids';
const MAX_STORED_POPUP_IDS = 200;

function loadDisplayedPopupIds() {
    try {
        const raw = window.localStorage.getItem(SHOWN_POPUP_STORAGE_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ids)) return new Set<string>();
        return new Set(ids.filter((id): id is string => typeof id === 'string'));
    } catch {
        return new Set<string>();
    }
}

function persistDisplayedPopupIds(ids: Set<string>) {
    try {
        const values = Array.from(ids).slice(-MAX_STORED_POPUP_IDS);
        window.localStorage.setItem(SHOWN_POPUP_STORAGE_KEY, JSON.stringify(values));
    } catch {
        // Storage may be unavailable in private/incognito contexts; in-memory dedupe still works.
    }
}

function getPopupDedupeKey(item: AdminNotification) {
    if (item.sourceType && item.sourceId) {
        return `${item.sourceType}:${item.sourceId}`;
    }
    return item.id;
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [open, setOpen] = useState(false);
    const [popupApi, contextHolder] = notification.useNotification();
    const displayedPopupIds = useRef(loadDisplayedPopupIds());
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'RESERVATION': return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
            case 'ORDER': return <CheckOutlined style={{ color: '#52c41a' }} />;
            case 'WARNING': return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'SYSTEM': return <InfoCircleOutlined style={{ color: '#722ed1' }} />;
            default: return <BellOutlined />;
        }
    };

    const formatTime = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小时前`;
        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const openSource = useCallback((item: AdminNotification) => {
        if (item.sourceType === 'order' && item.sourceId) {
            navigate('/orders');
        }
    }, [navigate]);

    const loadNotifications = useCallback(async () => {
        const data = await adminNotificationsApi.list({ status: 'all', limit: 50 });
        setNotifications(data);

        const freshOrder = data.find(item =>
            item.type === 'ORDER' &&
            !item.readAt &&
            !displayedPopupIds.current.has(getPopupDedupeKey(item))
        );

        if (freshOrder) {
            const popupKey = getPopupDedupeKey(freshOrder);
            displayedPopupIds.current.add(popupKey);
            persistDisplayedPopupIds(displayedPopupIds.current);
            popupApi.open({
                key: popupKey,
                message: freshOrder.title,
                description: freshOrder.content,
                duration: 5,
                onClick: () => openSource(freshOrder),
            });
        }
    }, [openSource, popupApi]);

    useEffect(() => {
        loadNotifications().catch(() => undefined);
        const timer = window.setInterval(() => {
            loadNotifications().catch(() => undefined);
        }, 15000);
        return () => window.clearInterval(timer);
    }, [loadNotifications]);

    const markAsRead = async (item: AdminNotification) => {
        if (!item.readAt) {
            await adminNotificationsApi.markRead(item.id);
            setNotifications(prev => prev.map(n => (
                n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n
            )));
        }
        setOpen(false);
        openSource(item);
    };

    const markAllAsRead = async () => {
        await adminNotificationsApi.markAllRead();
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || now })));
    };

    const renderList = (items: AdminNotification[]) => (
        <List
            className="notification-list"
            dataSource={items}
            renderItem={(item) => (
                <List.Item
                    className={`notification-item ${!item.readAt ? 'unread' : ''}`}
                    onClick={() => markAsRead(item)}
                >
                    <List.Item.Meta
                        avatar={<Avatar icon={getIcon(item.type)} style={{ background: 'transparent' }} />}
                        title={item.title}
                        description={
                            <div>
                                <div className="notification-desc">{item.content}</div>
                                <div className="notification-time">{formatTime(item.createdAt)}</div>
                            </div>
                        }
                    />
                    {!item.readAt && <div className="unread-dot" />}
                </List.Item>
            )}
            locale={{ emptyText: <Empty description="暂无通知" /> }}
        />
    );

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
                        children: renderList(notifications),
                    },
                    {
                        key: 'unread',
                        label: `未读 (${unreadCount})`,
                        children: renderList(notifications.filter(n => !n.readAt)),
                    },
                ]}
            />
        </div>
    );

    return (
        <>
            {contextHolder}
            <Dropdown
                popupRender={() => content}
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
        </>
    );
}
