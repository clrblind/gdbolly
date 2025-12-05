import { configureStore } from '@reduxjs/toolkit';
import debuggerReducer from './debuggerSlice';
import windowsReducer from './windowsSlice';

export const store = configureStore({
  reducer: {
    debug: debuggerReducer,
    windows: windowsReducer,
  },
});