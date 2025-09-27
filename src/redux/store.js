import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import candidateReducer from './slices/candidateSlice';
import sessionReducer from './slices/sessionSlice';

const rootReducer = combineReducers({
  candidate: candidateReducer,
  session: sessionReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['candidate', 'session'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);