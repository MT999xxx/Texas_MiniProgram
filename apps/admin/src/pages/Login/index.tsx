import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import './Login.css';

interface LoginForm {
    username: string;
    password: string;
}

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleLogin = async (values: LoginForm) => {
        setLoading(true);
        try {
            // 模拟登录（开发环境）
            // 实际项目中应调用真实API
            if (values.username === 'admin' && values.password === 'admin123') {
                const mockToken = 'mock_admin_token_' + Date.now();
                const mockUser = {
                    id: '1',
                    username: values.username,
                    name: '管理员',
                    role: 'admin'
                };

                localStorage.setItem('admin_token', mockToken);
                localStorage.setItem('admin_user', JSON.stringify(mockUser));

                message.success('登录成功');
                navigate('/dashboard');
            } else {
                message.error('用户名或密码错误');
            }
        } catch (error) {
            console.error('登录失败:', error);
            message.error('登录失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <Card className="login-card" bordered={false}>
                <div className="login-header">
                    <h1>TUSK ADMIN</h1>
                    <h2>德州扑克后台管理系统</h2>
                </div>

                <Form
                    form={form}
                    name="login"
                    onFinish={handleLogin}
                    size="large"
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="用户名"
                            autoComplete="off"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                            autoComplete="off"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                        >
                            登 录
                        </Button>
                    </Form.Item>
                </Form>

                <div className="login-tip">
                    <p>默认账号：admin / admin123</p>
                </div>
            </Card>
        </div>
    );
}
