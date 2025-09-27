// Minimal Gemini helper. Uses fetch to call Google Generative Language API.
// Falls back to static questions if no API key is present.

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
  if (!API_KEY) {
    return fallbackQuestions();
  }

  // Compose a prompt that returns JSON with six questions (2 easy, 2 medium, 2 hard)
  const prompt = `You are an expert interview question generator for a Full Stack (React + Node) role.
Return exactly 6 questions as JSON with fields: id, difficulty in ["easy","medium","hard"], text.
Include 2 easy, 2 medium, 2 hard. Keep each question concise.
JSON only, no prose.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }]}],
      }),
    });

    const data = await res.json();
    // Try to parse JSON from model output
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
      // Ensure order: 2 easy, 2 medium, 2 hard
      const ordered = [];
      for (const d of DIFFICULTY_ORDER) {
        ordered.push(...normalized.filter(q => q.difficulty === d).slice(0, 2));
      }
      if (ordered.length === 6) return ordered;
    }
    // Fallback if parsing fails
    return fallbackQuestions();
  } catch (e) {
    console.error('Gemini generation failed:', e);
    return fallbackQuestions();
  }
}