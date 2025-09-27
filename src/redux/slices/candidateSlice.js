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
  finalScore: null,
  summary: '',
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
  resetCandidate,
} = candidateSlice.actions;

export default candidateSlice.reducer;