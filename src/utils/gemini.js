// Gemini helpers: question generation + scoring/summary
import { DIFFICULTY_ORDER, TIME_LIMITS } from './constants';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

function fallbackQuestions() {
  const qs = [
    { difficulty: 'easy', text: 'Explain the difference between let, const, and var in JavaScript.' },
    { difficulty: 'easy', text: 'What is JSX and how does it relate to React.createElement?' },
    { difficulty: 'medium', text: 'Describe how React reconciliation works and why keys are important in lists.' },
    { difficulty: 'medium', text: 'Design a REST endpoint in Node/Express to create a user. Outline routes and middleware.' },
    { difficulty: 'hard', text: 'Given a large React app, how would you split bundles and optimize TTI? Mention code-splitting and caching strategies.' },
    { difficulty: 'hard', text: 'Implement a robust error handling strategy in a Node.js API with centralized error middleware and logging.' },
  ];
  return qs.map((q, i) => ({
    id: `q${i+1}`,
    difficulty: q.difficulty,
    text: q.text,
    timeLimit: TIME_LIMITS[q.difficulty],
  }));
}

export async function generateQuestions() {
  if (!API_KEY) return fallbackQuestions();

  const prompt = `You are an expert interview question generator for a Full Stack (React + Node) role.
Return exactly 6 questions as JSON array with fields: id, difficulty in ["easy","medium","hard"], text.
Include 2 easy, 2 medium, 2 hard. Keep each question concise.
JSON only, no prose.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }]}] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      const arr = JSON.parse(text.slice(start, end + 1));
      const normalized = arr.map((q, i) => ({
        id: q.id || `q${i+1}`,
        difficulty: q.difficulty,
        text: q.text,
        timeLimit: TIME_LIMITS[q.difficulty] || 60,
      }));
      const ordered = [];
      for (const d of DIFFICULTY_ORDER) {
        ordered.push(...normalized.filter(q => q.difficulty === d).slice(0, 2));
      }
      if (ordered.length === 6) return ordered;
    }
    return fallbackQuestions();
  } catch (e) {
    console.error('Gemini generation failed:', e);
    return fallbackQuestions();
  }
}

// -------- Scoring & Summary --------

function fallbackScore(questions, answers) {
  const scores = questions.map((q) => {
    const a = answers.find(x => x.questionId === q.id)?.text || '';
    const len = a.trim().split(/\s+/).length;
    let base = q.difficulty === 'easy' ? 4 : q.difficulty === 'medium' ? 6 : 8;
    let score = Math.min(10, Math.round(len / base));
    if (!a) score = 0;
    return {
      questionId: q.id,
      difficulty: q.difficulty,
      score,
      feedback: a ? 'Auto-scored (length heuristic).' : 'No answer provided.'
    };
  });
  const finalScore = scores.reduce((acc, s) => acc + s.score, 0);
  const summary = 'Auto-generated summary: candidate provided answers scored with a simple heuristic for demo purposes.';
  return { scores, finalScore, summary };
}

export async function scoreAnswers({ candidate, questions, answers }) {
  if (!API_KEY) return fallbackScore(questions, answers);

  const payload = {
    candidate: { name: candidate.name, email: candidate.email, phone: candidate.phone },
    questions: questions.map(q => ({ id: q.id, difficulty: q.difficulty, text: q.text })),
    answers: answers.map(a => ({ questionId: a.questionId, text: a.text, timedOut: a.timedOut })),
  };

  const prompt = `You are acting as an interviewer. Score each answer from 0-10 and give brief feedback.
Return JSON with:
{
  "scores": [{"questionId": "q1", "difficulty":"easy|medium|hard", "score": 0-10, "feedback": "short sentence"}],
  "finalScore": number,
  "summary": "2-3 sentence overall summary"
}
Questions and Answers:
${JSON.stringify(payload, null, 2)}
JSON only, no prose.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }]}] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) {
      const obj = JSON.parse(text.slice(objStart, objEnd + 1));
      const byId = new Map(questions.map(q => [q.id, q]));
      const scores = (obj.scores || []).map(s => ({
        questionId: s.questionId,
        difficulty: byId.get(s.questionId)?.difficulty || s.difficulty || 'easy',
        score: typeof s.score === 'number' ? s.score : 0,
        feedback: s.feedback || '',
      }));
      const finalScore = typeof obj.finalScore === 'number'
        ? obj.finalScore
        : scores.reduce((acc, s) => acc + (s.score || 0), 0);
      const summary = obj.summary || 'Summary unavailable.';
      return { scores, finalScore, summary };
    }
    return fallbackScore(questions, answers);
  } catch (e) {
    console.error('Gemini scoring failed:', e);
    return fallbackScore(questions, answers);
  }
}
