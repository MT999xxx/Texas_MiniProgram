import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import {
    DashboardOutlined,
    CalendarOutlined,
    TableOutlined,
    ShoppingOutlined,
    TeamOutlined,
    ShoppingCartOutlined,
    SettingOutlined,
    LogoutOutlined,
    UserOutlined,
    AuditOutlined,
    SwapOutlined,
    MenuOutlined,
} from '@ant-design/icons';
import { Drawer, Button } from 'antd';
import { useMediaQuery } from 'react-responsive';
import NotificationCenter from '../NotificationCenter';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // 响应式判断
    const isMobile = useMediaQuery({ maxWidth: 768 });

    // 获取当前用户信息
    const userStr = localStorage.getItem('admin_user');
    const user = userStr ? JSON.parse(userStr) : { name: '管理员' };

    // 菜单项配置
    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '仪表板',
        },
        {
            key: '/reservations',
            icon: <CalendarOutlined />,
            label: '预约管理',
        },
        {
            key: '/tables',
            icon: <TableOutlined />,
            label: '桌位管理',
        },
        {
            key: '/menu',
            icon: <ShoppingOutlined />,
            label: '菜单管理',
        },
        {
            key: '/members',
            icon: <TeamOutlined />,
            label: '会员管理',
        },
        {
            key: '/deposit-review',
            icon: <AuditOutlined />,
            label: '积分审核',
        },
        {
            key: '/transactions',
            icon: <SwapOutlined />,
            label: '交易记录',
        },
        {
            key: '/orders',
            icon: <ShoppingCartOutlined />,
            label: '订单管理',
        },
        {
            key: '/settings',
            icon: <SettingOutlined />,
            label: '系统设置',
        },
    ];

    // 用户下拉菜单
    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
        },
    ];

    const handleMenuClick = ({ key }: { key: string }) => {
        navigate(key);
    };

    const handleUserMenuClick = ({ key }: { key: string }) => {
        if (key === 'logout') {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            message.success('已退出登录');
            navigate('/login');
        }
    };

    return (
        <Layout className="main-layout">
            {!isMobile && (
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    width={240}
                    className="site-sider"
                >
                    <div className="logo-container">
                        <div className="logo-text">
                            {collapsed ? 'A' : '三条A 管理后台'}
                        </div>
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={handleMenuClick}
                        className="site-menu"
                    />
                </Sider>
            )}

            {/* 移动端抽屉菜单 */}
            <Drawer
                title="三条A 管理后台"
                placement="left"
                onClose={() => setMobileMenuVisible(false)}
                open={mobileMenuVisible}
                styles={{ body: { padding: 0 } }}
                width={250}
                className="mobile-drawer"
            >
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={(info) => {
                        handleMenuClick(info);
                        setMobileMenuVisible(false);
                    }}
                />
            </Drawer>

            <Layout className="site-layout">
                <Header className="site-header">
                    <div className="header-left">
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                onClick={() => setMobileMenuVisible(true)}
                                className="mobile-menu-btn"
                            />
                        )}
                    </div>
                    <div className="header-right">
                        <NotificationCenter />
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <div className="user-info-trigger">
                                <Avatar
                                    icon={<UserOutlined />}
                                    style={{ backgroundColor: 'var(--color-gold-primary)', color: '#000' }}
                                />
                                {!isMobile && <span className="user-name">{user.name}</span>}
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="site-content-wrapper">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
