
import React, { useState } from 'react';
import { Card, Typography, Upload, Button, message, Descriptions, Space } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { setProfile } from '../redux/slices/candidateSlice';
import { parseResumeToText, extractFieldsFromText } from '../utils/parseResume';

const { Paragraph, Title, Text } = Typography;

export default function Interviewee() {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [extracted, setExtracted] = useState({ name: '', email: '', phone: '' });
  const [rawText, setRawText] = useState('');

  const beforeUpload = (f) => {
    const isAllowed = ['application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)
      || f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.doc');
    if (!isAllowed) {
      message.error('Please upload a PDF or DOCX file.');
      return Upload.LIST_IGNORE;
    }
    setFile(f);
    return false;
  };

  const handleParse = async () => {
    if (!file) return message.warning('Please select a resume first.');
    try {
      setParsing(true);
      const text = await parseResumeToText(file);
      setRawText(text);
      const fields = extractFieldsFromText(text);
      setExtracted(fields);
      message.success('Parsed resume successfully.');
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to parse resume.');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = () => {
    if (!extracted.name && !extracted.email && !extracted.phone) {
      return message.warning('Nothing to save yet. Parse the resume first.');
    }
    dispatch(setProfile({
      name: extracted.name,
      email: extracted.email,
      phone: extracted.phone,
      resumeMeta: file ? { name: file.name, type: file.type, size: file.size } : null,
    }));
    message.success('Profile saved to session.');
  };

  return (
    <Card>
      <Title level={4}>Interviewee</Title>
      <Paragraph>Upload your resume to extract <Text strong>Name</Text>, <Text strong>Email</Text>, and <Text strong>Phone</Text>.</Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Upload beforeUpload={beforeUpload} maxCount={1} accept=".pdf,.doc,.docx">
          <Button icon={<UploadOutlined />}>Choose Resume</Button>
        </Upload>
        <Space>
          <Button type="primary" loading={parsing} onClick={handleParse}>Parse Resume</Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>Save Profile</Button>
        </Space>

        {(extracted.name || extracted.email || extracted.phone) && (
          <Descriptions title="Extracted Details" bordered size="small" column={1}>
            <Descriptions.Item label="Name">{extracted.name || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Email">{extracted.email || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Phone">{extracted.phone || <Text type="secondary">Not found</Text>}</Descriptions.Item>
          </Descriptions>
        )}

        {rawText && (
          <Paragraph type="secondary">
            <Text code ellipsis style={{ display: 'block', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{rawText.slice(0, 2000)}</Text>
          </Paragraph>
        )}
      </Space>
    </Card>
  );
}
