import { configureStore } from '@reduxjs/toolkit';
import debuggerReducer from './debuggerSlice';

export const store = configureStore({
  reducer: {
    debug: debuggerReducer,
  },
});