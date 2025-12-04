import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, message, ConfigProvider, theme } from 'antd';
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
} from '@ant-design/icons';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

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
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                width={240}
                className="site-sider"
            >
                <div className="logo-container">
                    <div className="logo-text">
                        {collapsed ? 'T' : 'TUSK ADMIN'}
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

            <Layout className="site-layout">
                <Header className="site-header">
                    <div className="header-left">
                        {/* 可以放置面包屑或其他导航元素 */}
                    </div>
                    <div className="header-right">
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
                                <span className="user-name">{user.name}</span>
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
