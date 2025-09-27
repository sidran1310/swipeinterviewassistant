
import React, { useMemo, useState } from 'react';
import { Card, Typography, Upload, Button, message, Descriptions, Space, Alert, Input, Table } from 'antd';
import { UploadOutlined, SaveOutlined, PlayCircleOutlined, SendOutlined, ReloadOutlined, TrophyOutlined, LoadingOutlined, SaveTwoTone } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  setProfile, setMissingFields, addMessage,
  startInterview, setQuestions, submitAnswer, nextQuestion,
  setScoringStatus, setScores, setFinalScore, setSummary
} from '../redux/slices/candidateSlice';
import { addOrUpdateCandidate } from '../redux/slices/rosterSlice';
import { parseResumeToText, extractFieldsFromText } from '../utils/parseResume';
import { generateQuestions, scoreAnswers } from '../utils/gemini';
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
    const currentMissing = missing;
    if (!currentMissing.length) return;
    const currentField = currentMissing[0];
    const normalized = validateAndNormalize(currentField, userText);
    if (!normalized) {
      return message.warning(promptFor(currentField));
    }
    dispatch(setProfile({ [currentField]: normalized }));
  };

  const allCaptured = Boolean(merged.name && merged.email && merged.phone);

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
      message.success('Interview completed. You can now score your answers.');
    }
  };

  // --- Scoring ---
  const handleScore = async () => {
    if (candidate.interviewStatus !== 'finished') {
      return message.warning('Finish the interview before scoring.');
    }
    try {
      dispatch(setScoringStatus('scoring'));
      const result = await scoreAnswers({
        candidate: { name: candidate.name, email: candidate.email, phone: candidate.phone },
        questions: candidate.questions,
        answers: candidate.answers,
      });
      dispatch(setScores(result.scores));
      dispatch(setFinalScore(result.finalScore));
      dispatch(setSummary(result.summary));
      dispatch(setScoringStatus('done'));
      message.success('Scoring completed.');

      // NEW: auto-save snapshot to roster so interviewer tab fills immediately
      const snapshot = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        resumeMeta: candidate.resumeMeta,
        finalScore: result.finalScore,
        summary: result.summary,
        questions: candidate.questions,
        answers: candidate.answers,
        scores: result.scores,
        messages: candidate.messages,
        createdAt: Date.now(),
      };
      dispatch(addOrUpdateCandidate(snapshot));
    } catch (e) {
      console.error(e);
      dispatch(setScoringStatus('idle'));
      message.error('Scoring failed.');
    }
  };

  const columns = [
    { title: 'Q#', dataIndex: 'questionId', width: 80 },
    { title: 'Difficulty', dataIndex: 'difficulty', width: 100 },
    { title: 'Score (0-10)', dataIndex: 'score', width: 120 },
    { title: 'Feedback', dataIndex: 'feedback' },
  ];

  return (
    <Card>
      <Title level={4}>Interviewee</Title>
      <Paragraph>Upload your resume — then start the interview, score your answers, and save to the dashboard.</Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap>
          <Upload beforeUpload={beforeUpload} maxCount={1} accept=".pdf,.doc,.docx">
            <Button icon={<UploadOutlined />}>Choose Resume</Button>
          </Upload>
          <Button type="primary" loading={parsing} onClick={handleParse}>Parse Resume</Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>Save Details</Button>
        </Space>

        {(merged.name || merged.email || merged.phone) && (
          <Descriptions title="Detected / Saved Details" bordered size="small" column={1}>
            <Descriptions.Item label="Name">{merged.name || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Email">{merged.email || <Text type="secondary">Not found</Text>}</Descriptions.Item>
            <Descriptions.Item label="Phone">{merged.phone || <Text type="secondary">Not found</Text>}</Descriptions.Item>
          </Descriptions>
        )}

        {/* --- Interview section --- */}
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
              <>
                <Alert type="success" showIcon message="Interview finished. Score your answers below." />
                <Space wrap>
                  <Button
                    type="primary"
                    icon={candidate.scoringStatus === 'scoring' ? <LoadingOutlined /> : <TrophyOutlined />}
                    loading={candidate.scoringStatus === 'scoring'}
                    onClick={handleScore}
                  >
                    {candidate.scoringStatus === 'scoring' ? 'Scoring…' : 'Score my answers'}
                  </Button>
                  {/* Keep manual save, but autosave already happens on scoring */}
                  <Button
                    type="default"
                    icon={<SaveTwoTone />}
                    disabled={candidate.scoringStatus !== 'done'}
                    onClick={() => {
                      const snapshot = {
                        name: candidate.name,
                        email: candidate.email,
                        phone: candidate.phone,
                        resumeMeta: candidate.resumeMeta,
                        finalScore: candidate.finalScore,
                        summary: candidate.summary,
                        questions: candidate.questions,
                        answers: candidate.answers,
                        scores: candidate.scores,
                        messages: candidate.messages,
                        createdAt: Date.now(),
                      };
                      dispatch(addOrUpdateCandidate(snapshot));
                      message.success('Saved to Interviewer Dashboard.');
                    }}
                  >
                    Save to Dashboard
                  </Button>
                </Space>
              </>
            )}
          </Space>
        </Card>

        {/* --- Results --- */}
        {candidate.scoringStatus === 'done' && (
          <Card type="inner" title="Results">
            <Alert
              type="success"
              showIcon
              message={<span><Text strong>Final Score:</Text> {candidate.finalScore} / 60</span>}
              description={candidate.summary}
              style={{ marginBottom: 16 }}
            />
            <Table
              rowKey={(r) => r.questionId}
              columns={columns}
              dataSource={candidate.scores}
              pagination={false}
              size="small"
            />
          </Card>
        )}

      </Space>
    </Card>
  );
}
