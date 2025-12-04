import { Skeleton, Card, Row, Col } from 'antd';
import './PageSkeleton.css';

interface Props {
    type?: 'dashboard' | 'table' | 'cards';
}

export default function PageSkeleton({ type = 'table' }: Props) {
    if (type === 'dashboard') {
        return (
            <div className="skeleton-dashboard">
                {/* Hero Skeleton */}
                <Card className="skeleton-hero">
                    <Row gutter={32}>
                        <Col span={14}>
                            <Skeleton.Button active style={{ width: 120, height: 28, marginBottom: 16 }} />
                            <Skeleton.Input active style={{ width: '80%', height: 40, marginBottom: 12 }} />
                            <Skeleton.Input active style={{ width: '60%', height: 20, marginBottom: 32 }} />
                            <Row gutter={16}>
                                <Col><Skeleton.Button active style={{ width: 100, height: 44 }} /></Col>
                                <Col><Skeleton.Button active style={{ width: 100, height: 44 }} /></Col>
                            </Row>
                        </Col>
                        <Col span={10}>
                            <Skeleton.Image active style={{ width: '100%', height: 200 }} />
                        </Col>
                    </Row>
                </Card>

                {/* Charts Skeleton */}
                <Row gutter={24} style={{ marginBottom: 24 }}>
                    <Col span={12}>
                        <Card className="skeleton-card">
                            <Skeleton.Input active style={{ width: 150, marginBottom: 20 }} />
                            <Skeleton.Image active style={{ width: '100%', height: 200 }} />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card className="skeleton-card">
                            <Skeleton.Input active style={{ width: 100, marginBottom: 20 }} />
                            <Skeleton.Avatar active size={150} shape="circle" />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card className="skeleton-card">
                            <Skeleton.Input active style={{ width: 100, marginBottom: 20 }} />
                            <Skeleton paragraph={{ rows: 5 }} active />
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    }

    if (type === 'cards') {
        return (
            <Row gutter={[24, 24]}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Col key={i} xs={24} sm={12} md={8} lg={6}>
                        <Card className="skeleton-card">
                            <Skeleton active paragraph={{ rows: 3 }} />
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    }

    // Default: Table skeleton
    return (
        <Card className="skeleton-card">
            <div className="skeleton-toolbar">
                <Skeleton.Button active style={{ width: 150 }} />
                <Skeleton.Input active style={{ width: 300, marginLeft: 16 }} />
            </div>
            <div className="skeleton-table">
                <div className="skeleton-table-header">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton.Button key={i} active style={{ width: '18%' }} />
                    ))}
                </div>
                {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="skeleton-table-row">
                        {[1, 2, 3, 4, 5].map((col) => (
                            <Skeleton.Input key={col} active style={{ width: '90%' }} />
                        ))}
                    </div>
                ))}
            </div>
        </Card>
    );
}
