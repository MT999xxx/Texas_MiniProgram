import { useState, useEffect, useCallback } from 'react';
import { Line, Pie, Bar } from '@ant-design/charts';
import { Modal, Form, Input, App, Select } from 'antd';
import { utils, writeFile } from 'xlsx';
import { noticesApi, NoticeType, Notice } from '../../api/notices';
import { statisticsApi, DashboardSummary, RevenueTrendItem, HotMenuItem, LeaderboardItem } from '../../api/statistics';
import './Dashboard.css';

export default function Dashboard() {
    const { message } = App.useApp();
    const [noticeModalVisible, setNoticeModalVisible] = useState(false);
    const [noticeType, setNoticeType] = useState<NoticeType>('ANNOUNCEMENT');
    const [noticeForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [latestNotice, setLatestNotice] = useState<Notice | null>(null);
    const [latestActivity, setLatestActivity] = useState<Notice | null>(null);
    const [stats, setStats] = useState<DashboardSummary>({
        totalReservations: 0,
        memberVisits: 0,
        totalRevenue: 0,
    });
    const [revenueRange, setRevenueRange] = useState<'7d' | '1m' | '6m'>('7d');

    // 真实数据 State
    const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendItem[]>([]);
    const [hotMenuData, setHotMenuData] = useState<HotMenuItem[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [noticeRes, activityRes, statsRes, hotMenuRes, leaderboardRes] = await Promise.all([
                noticesApi.getLatest('ANNOUNCEMENT'),
                noticesApi.getLatest('ACTIVITY'),
                statisticsApi.getSummary(),
                statisticsApi.getHotMenuItems(),
                statisticsApi.getLeaderboard(10),
            ]);
            setLatestNotice(noticeRes.data);
            setLatestActivity(activityRes.data);
            setStats(statsRes.data);
            setHotMenuData(hotMenuRes.data || []);
            setLeaderboard(leaderboardRes.data || []);
        } catch (error) {
            console.error('获取动态数据失败:', error);
        }
    }, []);

    // 营收趋势单独获取（范围变化时重新拉取）
    const fetchRevenueTrend = useCallback(async () => {
        try {
            const res = await statisticsApi.getRevenueTrend(revenueRange);
            setRevenueTrendData(res.data || []);
        } catch (error) {
            console.error('获取营收趋势失败:', error);
        }
    }, [revenueRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchRevenueTrend();
    }, [fetchRevenueTrend]);

    const handleOpenNoticeModal = (type: NoticeType) => {
        setNoticeType(type);
        noticeForm.resetFields();
        setNoticeModalVisible(true);
    };

    const handleNoticeSubmit = async () => {
        try {
            const values = await noticeForm.validateFields();
            setSubmitting(true);
            await noticesApi.create({
                ...values,
                type: noticeType,
                isActive: true,
            });
            message.success(`${noticeType === 'ANNOUNCEMENT' ? '公告' : '活动'}发布成功`);
            setNoticeModalVisible(false);
            fetchData(); // 刷新数据
        } catch (error) {
            console.error('发布失败:', error);
            message.error('发布失败，请检查输入');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = () => {
        try {
            const exportData = leaderboard.map((player, index) => ({
                '序号': index + 1,
                '名称': player.name,
                '积分': player.score
            }));

            const ws = utils.json_to_sheet(exportData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "积分排行榜");

            // 生成文件名: 积分排行榜_2024-12-24.xlsx
            const fileName = `积分排行榜_${new Date().toISOString().split('T')[0]}.xlsx`;
            writeFile(wb, fileName);
            message.success('排行榜导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败，请重试');
        }
    };

    // 营收趋势图配置
    const revenueConfig = {
        data: revenueTrendData,
        xField: 'date',
        yField: 'revenue',
        smooth: true,
        color: '#D4AF37',
        area: {
            style: {
                fill: 'l(270) 0:#D4AF3700 1:#D4AF3740',
            },
        },
        point: true,
        axis: {
            x: {
                labelFill: '#D4AF37',
                labelFontSize: 11,
                lineStroke: '#444',
            },
            y: {
                labelFill: '#D4AF37',
                labelFontSize: 11,
                labelFormatter: (v: any) => revenueRange === '6m' ? `¥${Number(v) / 1000}k` : `¥${Number(v)}`,
                gridStroke: '#333',
            },
        },
        tooltip: {
            items: [
                { name: '营收', channel: 'y', valueFormatter: (v: any) => `¥${v.toLocaleString()}` }
            ],
        },
    };


    // 热门菜品排行配置
    const hotMenuConfig = {
        data: hotMenuData,
        xField: 'name',
        yField: 'sales',
        color: '#D4AF37',
        axis: {
            x: {
                labelFill: '#D4AF37',
                labelFontSize: 10,
                labelAutoRotate: true,
            },
            y: {
                labelFill: '#D4AF37',
                labelFontSize: 11,
                gridStroke: '#333',
            },
        },
        label: {
            text: 'sales',
            fill: '#D4AF37',
            position: 'top',
        },
    };

    return (
        <div className="dashboard-page">
            <header className="hero-panel">
                <div className="hero-left">
                    <span className="hero-badge">重庆店 · 三条A</span>
                    <h1>德州扑克主题酒吧控制台</h1>
                    <p>预约赛桌 · 奢享酒食 · 决战巅峰</p>
                    <div className="hero-actions">
                        <button className="btn primary" onClick={() => handleOpenNoticeModal('ACTIVITY')}>发起活动</button>
                        <button className="btn ghost" onClick={() => handleOpenNoticeModal('ANNOUNCEMENT')}>发布公告</button>
                    </div>
                    <div className="hero-meta">
                        <div>
                            <strong>{stats.totalReservations}</strong>
                            <span>今日预约</span>
                        </div>
                        <div>
                            <strong>{stats.memberVisits}</strong>
                            <span>会员来店</span>
                        </div>
                        <div>
                            <strong>￥{stats.totalRevenue.toLocaleString()}</strong>
                            <span>预计营收</span>
                        </div>
                    </div>
                </div>
                <div className="hero-right">
                    <div className="snake-preview">
                        <div className="glow-circle" />
                        <div className="hero-card">
                            <span>最新公告</span>
                            <strong>{latestNotice?.title || '暂无公告'}</strong>
                            <p>{latestNotice?.content || '点击下方按钮发布您的第一条公告'}</p>
                        </div>
                        <div className="hero-card outline">
                            <span>热门活动</span>
                            <strong>{latestActivity?.title || '暂无活动'}</strong>
                            <p>{latestActivity?.content || '点击下方按钮发起您的第一场活动'}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* 数据可视化区域 */}
            <section className="charts-section">
                <div className="chart-card large">
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3>📈 营收趋势</h3>
                            <Select
                                value={revenueRange}
                                onChange={setRevenueRange}
                                size="small"
                                popupClassName="dark-select-popup"
                                variant="borderless"
                                style={{ color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}
                                options={[
                                    { value: '7d', label: '近7天' },
                                    { value: '1m', label: '近1个月' },
                                    { value: '6m', label: '近半年' },
                                ]}
                            />
                        </div>
                        <span className="chart-badge">+18.5%</span>
                    </div>
                    <div className="chart-body">
                        <Line {...revenueConfig} />
                    </div>
                </div>
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>🔥 热门菜品 TOP5</h3>
                    </div>
                    <div className="chart-body">
                        <Bar {...hotMenuConfig} />
                    </div>
                </div>
            </section>


            <section className="panel leaderboard-panel full-width">
                <div className="panel-header">
                    <div>
                        <h2>积分排行榜</h2>
                        <p>赛事积分实时刷新 · 激发竞争热度</p>
                    </div>
                    <button className="btn link" onClick={handleExport}>导出榜单</button>
                </div>
                <div className="leaderboard-scroll">
                    <ul className="leaderboard">
                        {leaderboard.map((player, index) => (
                            <li key={player.name}>
                                <div className="rank">{index + 1}</div>
                                <div className="avatar">{player.avatar}</div>
                                <div className="info">
                                    <strong>{player.name}</strong>
                                    <span>{player.tag}</span>
                                </div>
                                <div className="score">{player.score.toLocaleString()}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>


            <Modal
                title={noticeType === 'ANNOUNCEMENT' ? '发布公告' : '发起活动'}
                open={noticeModalVisible}
                onOk={handleNoticeSubmit}
                onCancel={() => setNoticeModalVisible(false)}
                confirmLoading={submitting}
                destroyOnClose
            >
                <Form
                    form={noticeForm}
                    layout="vertical"
                    initialValues={{ title: '', content: '' }}
                >
                    <Form.Item
                        name="title"
                        label="标题"
                        rules={[{ required: true, message: '请输入标题' }]}
                    >
                        <Input placeholder={`请输入${noticeType === 'ANNOUNCEMENT' ? '公告' : '活动'}标题`} />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="内容"
                        rules={[{ required: true, message: '请输入内容' }]}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder={`请输入${noticeType === 'ANNOUNCEMENT' ? '公告' : '活动'}具体内容`}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
