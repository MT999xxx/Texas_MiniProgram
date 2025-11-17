import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Layout, theme } from 'antd';
import App from './App';
import './styles.css';

const Root = () => (
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
    }}
  >
    <Layout style={{ minHeight: '100vh' }}>
      <App />
    </Layout>
  </ConfigProvider>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Root />);
