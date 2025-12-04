import { useState } from 'react';
import { Card, Form, Input, Button, message, Tabs, TimePicker, InputNumber, Switch, Space, Divider } from 'antd';
import { SaveOutlined, ShopOutlined, ClockCircleOutlined, GiftOutlined, BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './Settings.css';

export default function Settings() {
    const [storeForm] = Form.useForm();
    const [rulesForm] = Form.useForm();
    const [pointsForm] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 保存店铺信息
    const handleSaveStore = async () => {
        try {
            const values = await storeForm.validateFields();
            setLoading(true);
            // 模拟保存
            await new Promise(resolve => setTimeout(resolve, 500));
            message.success('店铺信息保存成功');
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 保存预约规则
    const handleSaveRules = async () => {
        try {
            const values = await rulesForm.validateFields();
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            message.success('预约规则保存成功');
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 保存积分规则
    const handleSavePoints = async () => {
        try {
            const values = await pointsForm.validateFields();
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            message.success('积分规则保存成功');
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page page-enter">
            <div className="panel-header">
                <div>
                    <h2>系统设置</h2>
                    <p>配置店铺信息、预约规则和积分规则</p>
                </div>
            </div>

            <Card bordered={false}>
                <Tabs
                    defaultActiveKey="store"
                    items={[
                        {
                            key: 'store',
                            label: (
                                <span><ShopOutlined /> 店铺信息</span>
                            ),
                            children: (
                                <Form
                                    form={storeForm}
                                    layout="vertical"
                                    initialValues={{
                                        name: 'TUSK 尖牙德州扑克',
                                        address: '重庆市渝中区解放碑步行街88号',
                                        phone: '023-88888888',
                                        openTime: dayjs('18:00', 'HH:mm'),
                                        closeTime: dayjs('02:00', 'HH:mm'),
                                        announcement: '欢迎来到 TUSK！周五德州大师赛火热报名中！',
                                    }}
                                    style={{ maxWidth: 600 }}
                                >
                                    <Form.Item name="name" label="店铺名称" rules={[{ required: true }]}>
                                        <Input placeholder="请输入店铺名称" />
                                    </Form.Item>
                                    <Form.Item name="address" label="店铺地址" rules={[{ required: true }]}>
                                        <Input placeholder="请输入店铺地址" />
                                    </Form.Item>
                                    <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
                                        <Input placeholder="请输入联系电话" />
                                    </Form.Item>
                                    <Form.Item label="营业时间">
                                        <Space>
                                            <Form.Item name="openTime" noStyle>
                                                <TimePicker format="HH:mm" />
                                            </Form.Item>
                                            <span>至</span>
                                            <Form.Item name="closeTime" noStyle>
                                                <TimePicker format="HH:mm" />
                                            </Form.Item>
                                        </Space>
                                    </Form.Item>
                                    <Form.Item name="announcement" label="店铺公告">
                                        <Input.TextArea rows={3} placeholder="输入店铺公告，将在小程序首页展示" />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSaveStore}>
                                            保存店铺信息
                                        </Button>
                                    </Form.Item>
                                </Form>
                            ),
                        },
                        {
                            key: 'reservation',
                            label: (
                                <span><ClockCircleOutlined /> 预约规则</span>
                            ),
                            children: (
                                <Form
                                    form={rulesForm}
                                    layout="vertical"
                                    initialValues={{
                                        advanceHours: 2,
                                        maxAdvanceDays: 7,
                                        mainDeposit: 200,
                                        sideDeposit: 100,
                                        trainingDeposit: 0,
                                        cancelHours: 2,
                                        autoConfirm: false,
                                    }}
                                    style={{ maxWidth: 600 }}
                                >
                                    <Divider orientation="left">预约时间</Divider>
                                    <Form.Item name="advanceHours" label="最少提前预约（小时）">
                                        <InputNumber min={0} max={24} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="maxAdvanceDays" label="最多提前预约（天）">
                                        <InputNumber min={1} max={30} style={{ width: '100%' }} />
                                    </Form.Item>

                                    <Divider orientation="left">订金设置</Divider>
                                    <Form.Item name="mainDeposit" label="主赛桌订金 (¥)">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="sideDeposit" label="副赛桌订金 (¥)">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="trainingDeposit" label="练习桌订金 (¥)">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>

                                    <Divider orientation="left">取消规则</Divider>
                                    <Form.Item name="cancelHours" label="免费取消时限（小时）" extra="在预约时间前多少小时可免费取消">
                                        <InputNumber min={0} max={48} style={{ width: '100%' }} />
                                    </Form.Item>

                                    <Divider orientation="left">自动化</Divider>
                                    <Form.Item name="autoConfirm" label="自动确认预约" valuePropName="checked">
                                        <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSaveRules}>
                                            保存预约规则
                                        </Button>
                                    </Form.Item>
                                </Form>
                            ),
                        },
                        {
                            key: 'points',
                            label: (
                                <span><GiftOutlined /> 积分规则</span>
                            ),
                            children: (
                                <Form
                                    form={pointsForm}
                                    layout="vertical"
                                    initialValues={{
                                        pointsPerYuan: 1,
                                        registerBonus: 100,
                                        inviteBonus: 50,
                                        birthdayMultiplier: 2,
                                        bronzeThreshold: 0,
                                        silverThreshold: 1000,
                                        goldThreshold: 5000,
                                        diamondThreshold: 20000,
                                    }}
                                    style={{ maxWidth: 600 }}
                                >
                                    <Divider orientation="left">基础规则</Divider>
                                    <Form.Item name="pointsPerYuan" label="消费积分比例" extra="每消费1元获得多少积分">
                                        <InputNumber min={0} max={10} style={{ width: '100%' }} addonAfter="积分/元" />
                                    </Form.Item>
                                    <Form.Item name="registerBonus" label="注册送积分">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="inviteBonus" label="邀请好友送积分">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="birthdayMultiplier" label="生日当天积分倍数">
                                        <InputNumber min={1} max={5} style={{ width: '100%' }} addonAfter="倍" />
                                    </Form.Item>

                                    <Divider orientation="left">等级门槛</Divider>
                                    <Form.Item name="bronzeThreshold" label="青铜会员（累计消费）">
                                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
                                    </Form.Item>
                                    <Form.Item name="silverThreshold" label="白银会员（累计消费）">
                                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
                                    </Form.Item>
                                    <Form.Item name="goldThreshold" label="黄金会员（累计消费）">
                                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
                                    </Form.Item>
                                    <Form.Item name="diamondThreshold" label="钻石会员（累计消费）">
                                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSavePoints}>
                                            保存积分规则
                                        </Button>
                                    </Form.Item>
                                </Form>
                            ),
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
