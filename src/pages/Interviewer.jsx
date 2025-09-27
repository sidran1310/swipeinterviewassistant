
import React, { useMemo, useState } from 'react';
import { Card, Typography, Table, Input, Space, Modal, Descriptions, Tag, Empty } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { removeCandidate } from '../redux/slices/rosterSlice';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

export default function Interviewer() {
  const dispatch = useDispatch();
  const roster = useSelector((s) => s.roster.candidates);

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return roster;
    return roster.filter((c) =>
      (c.name || '').toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
  }, [q, roster]);

  const columns = [
    { title: 'Candidate', dataIndex: 'name', sorter: (a,b)=> (a.name||'').localeCompare(b.name||'') },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
    {
      title: 'Final Score',
      dataIndex: 'finalScore',
      sorter: (a,b)=> (a.finalScore||0)-(b.finalScore||0),
      render: (v)=> <Text strong>{v ?? '—'}</Text>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      sorter: (a,b)=> (a.createdAt||0)-(b.createdAt||0),
      render: (t)=> t ? new Date(t).toLocaleString() : '—',
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <Space>
          <a onClick={()=> setSelected(row)}>View</a>
          <a style={{ color: '#ff4d4f' }} onClick={()=> dispatch(removeCandidate(row.id))}>Delete</a>
        </Space>
      )
    }
  ];

  return (
    <Card>
      <Title level={4}>Interviewer Dashboard</Title>
      <Paragraph type="secondary">
        {roster.length ? 'Search candidates, sort by score/date, view details.' : 'No candidates yet — finish an interview and scoring on the Interviewee tab.'}
      </Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Search
          placeholder="Search by name or email"
          allowClear
          onSearch={setQ}
          onChange={(e)=> setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />

        <Table
          rowKey={(r) => r.id}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <Empty description="Nothing here yet. Go to Interviewee, finish and score, it will auto-appear." /> }}
        />

        <Modal
          title={selected ? (selected.name || 'Candidate Details') : ''}
          open={!!selected}
          onCancel={()=> setSelected(null)}
          footer={null}
          width={900}
        >
          {selected && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Descriptions title="Profile" bordered size="small" column={2}>
                <Descriptions.Item label="Name">{selected.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{selected.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="Final Score"><Text strong>{selected.finalScore ?? '—'}</Text></Descriptions.Item>
                <Descriptions.Item label="Date">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</Descriptions.Item>
                <Descriptions.Item label="Resume">{selected.resumeMeta ? selected.resumeMeta.name : '—'}</Descriptions.Item>
              </Descriptions>

              {selected.summary && (
                <Card size="small" title="Summary">
                  <Paragraph>{selected.summary}</Paragraph>
                </Card>
              )}

              {Array.isArray(selected.scores) && selected.scores.length > 0 && (
                <Card size="small" title="Per-question Scores">
                  {selected.scores.map((s, idx)=> (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      <Tag color={s.difficulty === 'hard' ? 'red' : s.difficulty === 'medium' ? 'gold' : 'green'}>
                        {s.difficulty?.toUpperCase()}
                      </Tag>
                      <Text strong> {s.questionId}:</Text> {s.score}/10 — <Text type="secondary">{s.feedback}</Text>
                    </div>
                  ))}
                </Card>
              )}

              {Array.isArray(selected.answers) && selected.answers.length > 0 && (
                <Card size="small" title="Q&A">
                  {selected.questions?.map((q, idx)=> {
                    const a = selected.answers.find(x=> x.questionId === q.id);
                    return (
                      <div key={q.id} style={{ marginBottom: 12 }}>
                        <Text strong>Q{idx+1} ({q.difficulty.toUpperCase()}):</Text> {q.text}
                        <br/>
                        <Text strong>A:</Text> {a?.text || <Text type="secondary">—</Text>} {a?.timedOut ? <Tag color="volcano">Timed out</Tag> : null}
                      </div>
                    );
                  })}
                </Card>
              )}
            </Space>
          )}
        </Modal>
      </Space>
    </Card>
  );
}
