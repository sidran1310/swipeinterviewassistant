import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTab: 'interviewee',
  inProgress: false,
  welcomeBackNeeded: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    setInProgress(state, action) {
      state.inProgress = action.payload;
    },
    setWelcomeBackNeeded(state, action) {
      state.welcomeBackNeeded = action.payload;
    },
    resetSession() {
      return { ...initialState };
    },
  },
});

export const { setActiveTab, setInProgress, setWelcomeBackNeeded, resetSession } = sessionSlice.actions;
export default sessionSlice.reducer;