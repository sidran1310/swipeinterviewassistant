import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  candidates: [], // [{id, name, email, phone, finalScore, summary, createdAt, questions, answers, scores, messages, resumeMeta}]
};

const rosterSlice = createSlice({
  name: 'roster',
  initialState,
  reducers: {
    addOrUpdateCandidate: {
      reducer(state, action) {
        const c = action.payload;
        const idx = state.candidates.findIndex(x => (x.email && c.email) ? x.email === c.email : x.id === c.id);
        if (idx >= 0) state.candidates[idx] = c;
        else state.candidates.unshift(c);
      },
      prepare(snapshot) {
        return {
          payload: {
            id: snapshot.id || nanoid(),
            ...snapshot,
          }
        };
      }
    },
    removeCandidate(state, action) {
      state.candidates = state.candidates.filter(c => c.id !== action.payload);
    },
    clearRoster(state) {
      state.candidates = [];
    }
  }
});

export const { addOrUpdateCandidate, removeCandidate, clearRoster } = rosterSlice.actions;
export default rosterSlice.reducer;