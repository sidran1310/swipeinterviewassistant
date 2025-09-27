
import React, { useMemo, useState } from 'react';
import { Card, Typography, Upload, Button, message, Descriptions, Space, Alert, Input } from 'antd';
import { UploadOutlined, SaveOutlined, PlayCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  setProfile, setMissingFields, addMessage,
  startInterview, setQuestions, submitAnswer, nextQuestion
} from '../redux/slices/candidateSlice';
import { parseResumeToText, extractFieldsFromText } from '../utils/parseResume';
import { generateQuestions } from '../utils/gemini';
import ChatBox from '../components/ChatBox';
import Timer from '../components/Timer';
import { TIME_LIMITS } from '../utils/constants';

const { Paragraph, Title, Text } = Typography;
const { TextArea } = Input;

const REQUIRED = ['name','email','phone'];

export default function Interviewee() {
  const dispatch = useDispatch();
  const candidate = useSelector((s) => s.candidate);

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [extracted, setExtracted] = useState({ name: '', email: '', phone: '' });
  const [rawText, setRawText] = useState('');

  // interview local UI state
  const [answer, setAnswer] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const currentQ = candidate.questions[candidate.currentQuestionIndex];

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
      dispatch(addMessage({ role: 'bot', text: `I found — Name: ${fields.name || '—'}, Email: ${fields.email || '—'}, Phone: ${fields.phone || '—'}.` }));
      message.success('Parsed resume successfully.');
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to parse resume.');
    } finally {
      setParsing(false);
    }
  };

  // merged (preview + saved) for display
  const merged = useMemo(() => ({
    name: candidate.name || extracted.name || '',
    email: candidate.email || extracted.email || '',
    phone: candidate.phone || extracted.phone || '',
  }), [candidate, extracted]);

  const missing = useMemo(() => REQUIRED.filter((k) => !merged[k]), [merged]);

  const handleSave = () => {
    const payload = {
      name: merged.name,
      email: merged.email,
      phone: merged.phone,
      resumeMeta: file ? { name: file.name, type: file.type, size: file.size } : candidate.resumeMeta,
    };
    dispatch(setProfile(payload));
    dispatch(setMissingFields(missing));

    if (missing.length) {
      dispatch(addMessage({ role: 'bot', text: `Saved. I still need: ${missing.join(', ')}.` }));
      const next = missing[0];
      dispatch(addMessage({ role: 'bot', text: promptFor(next) }));
    } else {
      dispatch(addMessage({ role: 'bot', text: 'All set — Name, Email, and Phone captured.' }));
    }
    message.success('Profile saved.');
  };

  const promptFor = (field) => {
    if (field === 'name') return 'What is your full name?';
    if (field === 'email') return 'Please share your email address.';
    if (field === 'phone') return 'Please share your phone number (with country code if applicable).';
    return 'Please provide the information.';
  };

  const validateAndNormalize = (field, value) => {
    const v = value.trim();
    if (field === 'email') {
      const ok = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);
      return ok ? v : null;
    }
    if (field === 'phone') {
      const m = v.replace(/\s+/g,' ').match(/(\+\d{1,3}[- ]?)?(\d{3}[- ]?\d{3}[- ]?\d{4}|\d{10,15})/);
      return m ? m[0] : null;
    }
    if (field === 'name') {
      return v.length >= 3 ? v : null;
    }
    return v || null;
  };

  const onSend = (userText) => {
    dispatch(addMessage({ role: 'user', text: userText }));
    const currentMissing = candidate.missingFields.length ? candidate.missingFields : missing;
    if (!currentMissing.length) return;

    const currentField = currentMissing[0];
    const normalized = validateAndNormalize(currentField, userText);
    if (!normalized) {
      dispatch(addMessage({ role: 'bot', text: `That doesn't look like a valid ${currentField}. ${promptFor(currentField)}` }));
      return;
    }
    dispatch(setProfile({ [currentField]: normalized }));

    const remaining = currentMissing.slice(1);
    dispatch(setMissingFields(remaining));
    if (remaining.length) {
      dispatch(addMessage({ role: 'bot', text: `Got it. Still need: ${remaining.join(', ')}.` }));
      dispatch(addMessage({ role: 'bot', text: promptFor(remaining[0]) }));
    } else {
      dispatch(addMessage({ role: 'bot', text: 'Great — all details obtained. You can start the interview below.' }));
    }
  };

  const storeMissingCount = candidate.missingFields.length;
  const showChat = (storeMissingCount ? storeMissingCount : missing.length) > 0;
  const allCaptured = Boolean(candidate.name && candidate.email && candidate.phone);

  // --- Interview handlers ---
  const canStart = allCaptured && candidate.interviewStatus !== 'running';

  const handleStartInterview = async () => {
    try {
      dispatch(startInterview());
      const qs = await generateQuestions();
      dispatch(setQuestions(qs));
      setAnswer('');
      setTimerRunning(true);
      message.success('Interview started.');
    } catch (e) {
      console.error(e);
      message.error('Failed to start interview. Using fallback questions.');
      dispatch(startInterview());
    }
  };

  const handleSubmitAnswer = (timedOut = false) => {
    const q = candidate.questions[candidate.currentQuestionIndex];
    if (!q) return;
    const text = (answer || '').trim();
    dispatch(submitAnswer({ questionId: q.id, text, timedOut }));
    setAnswer('');
    // next
    dispatch(nextQuestion());
    const nextQ = candidate.questions[candidate.currentQuestionIndex + 1];
    if (nextQ) {
      setTimerRunning(false);
      setTimeout(() => setTimerRunning(true), 0);
    } else {
      setTimerRunning(false);
      message.success('Interview completed. Scoring in the next step.');
    }
  };

  return (
    <Card>
      <Title level={4}>Interviewee</Title>
      <Paragraph>Upload your resume — I’ll show what I extracted, then ask only what’s missing. Once done, start the interview below.</Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Upload beforeUpload={beforeUpload} maxCount={1} accept=".pdf,.doc,.docx">
            <Button icon={<UploadOutlined />}>Choose Resume</Button>
          </Upload>
          <Button type="primary" loading={parsing} onClick={handleParse}>Parse Resume</Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>Save & Continue</Button>
        </Space>

        {(merged.name || merged.email || merged.phone) && (
          <Descriptions title="Detected / Saved Details" bordered size="small" column={1}>
            <Descriptions.Item label="Name">{merged.name || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Email">{merged.email || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Phone">{merged.phone || <Text type="secondary">Not found</Text>}</Descriptions.Item>
          </Descriptions>
        )}

        {showChat ? (
          <>
            <Alert
              type="warning"
              showIcon
              message={<span>Missing: <Text code>{(storeMissingCount ? candidate.missingFields : missing).join(', ')}</Text></span>}
            />
            <ChatBox messages={candidate.messages} onSend={onSend} viewportHeight={110} />
          </>
        ) : (
          allCaptured && <Alert type="success" showIcon message="All three details captured. You can start the interview below." />
        )}

        {/* --- Interview section is ALWAYS visible; Start is disabled until allCaptured --- */}
        <Card type="inner" title="Interview">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                disabled={!canStart}
                onClick={handleStartInterview}
              >
                Start Interview
              </Button>
              {candidate.interviewStatus === 'running' && currentQ && (
                <Timer
                  total={currentQ.timeLimit || TIME_LIMITS[currentQ.difficulty] || 60}
                  running={timerRunning}
                  onExpire={() => handleSubmitAnswer(true)}
                />
              )}
            </Space>

            {candidate.interviewStatus === 'running' && currentQ && (
              <>
                <Alert
                  type="info"
                  showIcon
                  message={<span><Text strong>Question {candidate.currentQuestionIndex + 1} / {candidate.questions.length}</Text> — <Text code>{currentQ.difficulty.toUpperCase()}</Text></span>}
                  description={<div style={{ marginTop: 8 }}>{currentQ.text}</div>}
                />
                <TextArea
                  rows={5}
                  placeholder="Type your answer here…"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <Button type="primary" icon={<SendOutlined />} onClick={() => handleSubmitAnswer(false)}>
                  Submit Answer
                </Button>
              </>
            )}

            {candidate.interviewStatus === 'finished' && (
              <Alert type="success" showIcon message="Interview finished. We’ll score your responses next." />
            )}
          </Space>
        </Card>

      </Space>
    </Card>
  );
}
