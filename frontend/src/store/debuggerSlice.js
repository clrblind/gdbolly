import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'IDLE', // IDLE, RUNNING, PAUSED, EXITED
  registers: [],
  disassembly: [],
  logs: []
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
      // В реальном Olly тут нужно сравнивать с предыдущим, чтобы подсветить красным
      state.registers = action.payload;
    },
    updateDisassembly: (state, action) => {
      state.disassembly = action.payload;
    },
    addLog: (state, action) => {
      state.logs.push(action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
    }
  },
});

export const { setStatus, updateRegisters, updateDisassembly, addLog } = debuggerSlice.actions;
export default debuggerSlice.reducer;