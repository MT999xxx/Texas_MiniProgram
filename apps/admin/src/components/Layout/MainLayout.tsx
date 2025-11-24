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
                theme="dark"
                width={220}
            >
                <div className="logo">
                    <span className="logo-text">{collapsed ? 'T' : 'Texas Bar'}</span>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
            </Sider>

            <Layout>
                <Header className="site-header">
                    <div className="header-left">
                        <h2>德州扑克酒吧后台管理系统</h2>
                    </div>
                    <div className="header-right">
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                        >
                            <div className="user-info">
                                <Avatar icon={<UserOutlined />} />
                                <span className="user-name">{user.name}</span>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="site-content">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
