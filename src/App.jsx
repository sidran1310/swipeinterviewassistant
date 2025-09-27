import React from 'react';
import { Tabs, Layout, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab } from './redux/slices/sessionSlice';
import Interviewee from './pages/Interviewee';
import Interviewer from './pages/Interviewer';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function App() {
  const dispatch = useDispatch();
  const activeTab = useSelector((s) => s.session.activeTab);

  const items = [
    { key: 'interviewee', label: 'Interviewee (Chat)', children: <Interviewee /> },
    { key: 'interviewer', label: 'Interviewer (Dashboard)', children: <Interviewer /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: 0 }}>AI-Powered Interview Assistant</Title>
      </Header>
      <Content style={{ padding: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => dispatch(setActiveTab(k))}
          items={items}
          destroyInactiveTabPane={false}
        />
      </Content>
    </Layout>
  );
}