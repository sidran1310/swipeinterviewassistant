import React from 'react';
import { Card, Typography, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Paragraph, Title } = Typography;

export default function Interviewee() {
  return (
    <Card>
      <Title level={4}>Interviewee</Title>
      <Paragraph>Upload your resume to get started. (PDF required, DOCX optional)</Paragraph>

      <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.doc,.docx">
        <Button icon={<UploadOutlined />}>Upload Resume</Button>
      </Upload>

      <div style={{ height: 16 }} />
      <Paragraph type="secondary">
        Next steps: parse basic details (Name, Email, Phone), then start the chat.
      </Paragraph>
    </Card>
  );
}