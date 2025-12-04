import { Line, Pie, Bar } from '@ant-design/charts';
import './Dashboard.css';

// 模拟数据
const revenueData = [
    { date: '11/28', revenue: 12800 },
    { date: '11/29', revenue: 15600 },
    { date: '11/30', revenue: 18200 },
    { date: '12/01', revenue: 21500 },
    { date: '12/02', revenue: 19800 },
    { date: '12/03', revenue: 24300 },
    { date: '12/04', revenue: 22100 },
];

const reservationData = [
    { type: '主赛桌', value: 45 },
    { type: '副赛桌', value: 32 },
    { type: '练习桌', value: 23 },
];

const hotMenuData = [
    { name: '火焰威士忌塔', sales: 128 },
    { name: '冠军定制套餐', sales: 96 },
    { name: '午夜能量Shot', sales: 85 },
    { name: '皇家精酿', sales: 72 },
    { name: '特调鸡尾酒', sales: 68 },
];

const leaderboard = [
    { name: 'Husk·Aiden', score: 12890, tag: '周榜冠军', avatar: '🦊' },
    { name: 'Husk·Yuri', score: 11840, tag: '热度飙升', avatar: '🐺' },
    { name: 'Husk·Jaden', score: 11030, tag: '连胜 5 场', avatar: '🐻' },
];

const reservationStatus = [
    { title: '主赛桌', value: '09 / 12', desc: '巅峰桌实时余位', accent: 'MAIN' },
    { title: '副赛桌', value: '04 / 10', desc: '好友拼桌 · 轻松局', accent: 'SIDE' },
    { title: '练习桌', value: '05 / 08', desc: '快速上手体验', accent: 'TRAINING' },
];

const events = [
    { tag: '赛事', title: '德州大师赛 · 火热报名中', time: '周六 19:00', badge: 'TOP1 入场券' },
    { tag: '福利', title: '新会员注册即送 200 积分', time: '长期有效', badge: '积分加速' },
    { tag: '公告', title: '周五店内升级，暂停营业一天', time: '12/06(周五)', badge: '营运提示' },
];

const memberPerks = [
    { title: '积分兑换', desc: '2000 积分可换专属酒水', icon: '🎁' },
    { title: '尊享服务', desc: '会员预留座位 · 专属管家', icon: '👑' },
    { title: '邀请礼遇', desc: '邀友到店双方额外 +100', icon: '🤝' },
];

export default function Dashboard() {
    // 营收趋势图配置
    const revenueConfig = {
        data: revenueData,
        xField: 'date',
        yField: 'revenue',
        smooth: true,
        color: '#D4AF37',
        areaStyle: {
            fill: 'l(270) 0:#D4AF3700 1:#D4AF3740',
        },
        point: {
            size: 4,
            shape: 'circle',
            style: {
                fill: '#D4AF37',
                stroke: '#000',
                lineWidth: 2,
            },
        },
        xAxis: {
            label: { style: { fill: '#666' } },
            line: { style: { stroke: '#333' } },
        },
        yAxis: {
            label: {
                style: { fill: '#666' },
                formatter: (v: string) => `¥${Number(v) / 1000}k`,
            },
            grid: { line: { style: { stroke: '#222' } } },
        },
        tooltip: {
            formatter: (datum: { revenue: number }) => ({
                name: '营收',
                value: `¥${datum.revenue.toLocaleString()}`,
            }),
        },
    };

    // 预约统计饼图配置
    const reservationPieConfig = {
        data: reservationData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        innerRadius: 0.6,
        color: ['#D4AF37', '#AA8A2E', '#F4D03F'],
        label: {
            type: 'outer',
            content: '{name} {percentage}',
            style: { fill: '#999', fontSize: 12 },
        },
        legend: {
            position: 'bottom' as const,
            itemName: { style: { fill: '#999' } },
        },
        statistic: {
            title: {
                content: '总预约',
                style: { color: '#999', fontSize: '14px' },
            },
            content: {
                content: '100',
                style: { color: '#D4AF37', fontSize: '24px', fontWeight: 'bold' },
            },
        },
    };

    // 热门菜品排行配置
    const hotMenuConfig = {
        data: hotMenuData,
        xField: 'sales',
        yField: 'name',
        color: '#D4AF37',
        barBackground: { style: { fill: 'rgba(255,255,255,0.05)' } },
        xAxis: {
            label: { style: { fill: '#666' } },
            grid: { line: { style: { stroke: '#222' } } },
        },
        yAxis: {
            label: { style: { fill: '#999' } },
        },
        label: {
            position: 'right' as const,
            style: { fill: '#D4AF37' },
        },
    };

    return (
        <div className="dashboard-page">
            <header className="hero-panel">
                <div className="hero-left">
                    <span className="hero-badge">重庆店 · 尖牙 TUSK</span>
                    <h1>德州扑克主题酒吧控制台</h1>
                    <p>预约赛桌 · 奢享酒食 · 决战巅峰</p>
                    <div className="hero-actions">
                        <button className="btn primary">发起活动</button>
                        <button className="btn ghost">发布公告</button>
                    </div>
                    <div className="hero-meta">
                        <div>
                            <strong>128</strong>
                            <span>今日预约</span>
                        </div>
                        <div>
                            <strong>56</strong>
                            <span>会员来店</span>
                        </div>
                        <div>
                            <strong>￥82,430</strong>
                            <span>预计营收</span>
                        </div>
                    </div>
                </div>
                <div className="hero-right">
                    <div className="snake-preview">
                        <div className="glow-circle" />
                        <div className="hero-card">
                            <span>实时预警</span>
                            <strong>练习桌已满座 · 转入排队模式</strong>
                            <p>副赛桌 D3 玩家等待 12 分钟，请调度场控。</p>
                        </div>
                        <div className="hero-card outline">
                            <span>今晚推荐</span>
                            <strong>至尊狂欢套餐</strong>
                            <p>三杯精酿 + 牛排拼盘 + 限定甜品</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* 数据可视化区域 */}
            <section className="charts-section">
                <div className="chart-card large">
                    <div className="chart-header">
                        <h3>📈 营收趋势 (近7天)</h3>
                        <span className="chart-badge">+18.5%</span>
                    </div>
                    <div className="chart-body">
                        <Line {...revenueConfig} />
                    </div>
                </div>
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>📊 预约分布</h3>
                    </div>
                    <div className="chart-body">
                        <Pie {...reservationPieConfig} />
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

            <section className="panel reservation-panel">
                <div className="panel-header">
                    <div>
                        <h2>赛桌预约状态</h2>
                        <p>实时掌握各桌位负载与等待情况</p>
                    </div>
                    <button className="btn link">查看预约列表</button>
                </div>
                <div className="status-grid">
                    {reservationStatus.map((item) => (
                        <div className="status-card" key={item.title}>
                            <div className="status-head">
                                <span className="accent">{item.accent}</span>
                                <strong>{item.value}</strong>
                            </div>
                            <p>{item.desc}</p>
                            <button className="btn ghost" style={{ width: '100%', marginTop: '10px' }}>调度</button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid two-column">
                <div className="panel leaderboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>积分排行榜</h2>
                            <p>赛事积分实时刷新 · 激发竞争热度</p>
                        </div>
                        <button className="btn link">导出榜单</button>
                    </div>
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

                <div className="panel member-panel">
                    <div className="panel-header">
                        <div>
                            <h2>会员权益中心</h2>
                            <p>升级激励 + 现场推送 = 拉升复购</p>
                        </div>
                        <button className="btn link">配置等级</button>
                    </div>
                    <div className="member-hero">
                        <div>
                            <span>今日新增会员</span>
                            <strong>+24</strong>
                        </div>
                        <div>
                            <span>会员贡献营收</span>
                            <strong>￥56,420</strong>
                        </div>
                    </div>
                    <div className="perk-grid">
                        {memberPerks.map((perk) => (
                            <div className="perk-card" key={perk.title}>
                                <div className="perk-icon">{perk.icon}</div>
                                <div>
                                    <strong>{perk.title}</strong>
                                    <p>{perk.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="panel events-panel">
                <div className="panel-header">
                    <div>
                        <h2>活动与公告</h2>
                        <p>跟进运营节点 · 与玩家保持沟通</p>
                    </div>
                    <button className="btn link">全部活动</button>
                </div>
                <div className="event-list">
                    {events.map((event) => (
                        <div className="event-card" key={event.title}>
                            <div className="event-tag">{event.tag}</div>
                            <div>
                                <strong>{event.title}</strong>
                                <p>{event.time}</p>
                            </div>
                            <span className="event-badge">{event.badge}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
