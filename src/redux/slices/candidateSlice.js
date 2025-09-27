import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // profile
  name: '',
  email: '',
  phone: '',
  resumeMeta: null,

  // chat
  messages: [
    { role: 'bot', text: 'Welcome! Upload your resume, then we will collect any missing details.' }
  ],
  missingFields: [],

  // interview
  interviewStatus: 'idle', // idle | running | finished
  questions: [],           // [{id, difficulty, text, timeLimit}]
  currentQuestionIndex: 0,
  answers: [],             // [{questionId, text, submittedAt, timedOut}]

  // scoring
  scoringStatus: 'idle',   // idle | scoring | done
  scores: [],              // [{questionId, difficulty, score, feedback}]
  finalScore: null,        // sum of per-question scores
  summary: '',             // overall summary
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setProfile(state, action) {
      const { name, email, phone, resumeMeta } = action.payload;
      if (name !== undefined) state.name = name;
      if (email !== undefined) state.email = email;
      if (phone !== undefined) state.phone = phone;
      if (resumeMeta !== undefined) state.resumeMeta = resumeMeta;
    },
    setMissingFields(state, action) {
      state.missingFields = action.payload || [];
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },

    // Interview reducers
    startInterview(state) {
      state.interviewStatus = 'running';
      state.currentQuestionIndex = 0;
      state.answers = [];
      state.finalScore = null;
      state.summary = '';
      state.scores = [];
      state.scoringStatus = 'idle';
    },
    setQuestions(state, action) {
      state.questions = action.payload || [];
    },
    submitAnswer(state, action) {
      const { questionId, text, timedOut } = action.payload;
      state.answers.push({
        questionId,
        text,
        timedOut: !!timedOut,
        submittedAt: Date.now(),
      });
    },
    nextQuestion(state) {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
      } else {
        state.interviewStatus = 'finished';
      }
    },

    // Scoring reducers
    setScoringStatus(state, action) {
      state.scoringStatus = action.payload;
    },
    setScores(state, action) {
      state.scores = action.payload || [];
    },
    setFinalScore(state, action) {
      state.finalScore = action.payload ?? null;
    },
    setSummary(state, action) {
      state.summary = action.payload || '';
    },

    resetCandidate() {
      return { ...initialState };
    },
  },
});

export const {
  setProfile,
  setMissingFields,
  addMessage,
  startInterview,
  setQuestions,
  submitAnswer,
  nextQuestion,
  setScoringStatus,
  setScores,
  setFinalScore,
  setSummary,
  resetCandidate,
} = candidateSlice.actions;

export default candidateSlice.reducer;