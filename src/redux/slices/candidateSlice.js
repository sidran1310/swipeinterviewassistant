import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: '',
  email: '',
  phone: '',
  resumeMeta: null,
  questions: [],
  answers: [],
  scores: [],
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
    resetCandidate() {
      return { ...initialState };
    },
  },
});

export const { setProfile, resetCandidate } = candidateSlice.actions;
export default candidateSlice.reducer;