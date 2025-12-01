import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'IDLE', // IDLE, RUNNING, PAUSED, EXITED
  registers: [],
  disassembly: [],
  logs: [],
  selectedAddress: null, // Address selected by user (cursor)
  
  // User customizations
  userComments: {}, // { "0x4005d0": "My custom comment" }
  
  // Settings
  settings: {
    showGdbComments: true,
  },
};

export const debuggerSlice = createSlice({
  name: 'debugger',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    updateRegisters: (state, action) => {
      // action.payload = [{number: '1', value: '0x...'}, ...]
      state.registers = action.payload;
    },
    updateDisassembly: (state, action) => {
      state.disassembly = action.payload;
    },
    addLog: (state, action) => {
      state.logs.push(action.payload);
    },
    setSelectedAddress: (state, action) => {
      state.selectedAddress = action.payload;
    },
    setUserComment: (state, action) => {
      const { address, comment } = action.payload;
      if (comment === null || comment === '') {
        delete state.userComments[address];
      } else {
        state.userComments[address] = comment;
      }
    },
    toggleShowGdbComments: (state, action) => {
        state.settings.showGdbComments = action.payload;
    },
    clearLogs: (state) => {
      state.logs = [];
    }
  },
});

export const { 
  setStatus, 
  updateRegisters, 
  updateDisassembly, 
  addLog, 
  setSelectedAddress,
  setUserComment,
  toggleShowGdbComments
} = debuggerSlice.actions;
export default debuggerSlice.reducer;