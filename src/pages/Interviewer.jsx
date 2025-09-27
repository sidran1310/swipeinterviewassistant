import React from 'react';
import { Card, Typography, Table } from 'antd';

const { Title, Paragraph } = Typography;

export default function Interviewer() {
  const columns = [
    { title: 'Candidate', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Final Score', dataIndex: 'finalScore', sorter: (a, b) => (a.finalScore ?? 0) - (b.finalScore ?? 0) },
  ];
  const data = [];

  return (
    <Card>
      <Title level={4}>Interviewer Dashboard</Title>
      <Paragraph type="secondary">Scores, summaries, and detailed chat history will appear here.</Paragraph>
      <Table rowKey={(r) => r.email ?? r.name} columns={columns} dataSource={data} pagination={false} />
    </Card>
  );
}
