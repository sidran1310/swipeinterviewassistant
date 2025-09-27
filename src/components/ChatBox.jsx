import React, { useState, useRef, useEffect } from 'react';
import { List, Input, Button, Space, Typography, Card } from 'antd';

const { Text } = Typography;

/**
 * ChatBox
 * Props:
 *  - messages: [{role:'bot'|'user', text:string}]
 *  - onSend: (text)=>void
 *  - viewportHeight: number (px) -> limit visible chat height (e.g., 90-120px for ~3-4 lines)
 */
export default function ChatBox({ messages = [], onSend, viewportHeight = 110 }) {
  const [value, setValue] = useState('');
  const listRef = useRef(null);

  const handleSend = () => {
    const v = value.trim();
    if (!v) return;
    onSend?.(v);
    setValue('');
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card size="small" style={{ maxWidth: 800 }}>
      <div
        ref={listRef}
        style={{ maxHeight: viewportHeight, overflow: 'auto', paddingRight: 8, marginBottom: 8, border: '1px solid #f0f0f0', borderRadius: 8 }}
      >
        <List
          dataSource={messages}
          renderItem={(m, i) => (
            <List.Item style={{ display: 'block', border: 'none', padding: '8px 12px' }} key={i}>
              <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    background: m.role === 'user' ? '#1677ff' : '#f5f5f5',
                    color: m.role === 'user' ? 'white' : 'black',
                    padding: '8px 12px',
                    borderRadius: 12,
                    maxWidth: '70%',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  <Text style={{ color: m.role === 'user' ? 'white' : 'rgba(0,0,0,0.88)' }}>
                    {m.text}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="Type your message…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={handleSend}
        />
        <Button type="primary" onClick={handleSend}>Send</Button>
      </Space.Compact>
    </Card>
  );
}