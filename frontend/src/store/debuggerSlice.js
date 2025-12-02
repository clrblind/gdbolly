
import { createSlice } from '@reduxjs/toolkit';
import { normalizeAddress } from '../utils/addressUtils';

const initialState = {
  status: 'IDLE', // IDLE, RUNNING, PAUSED, EXITED
  currentThreadId: null,
  registers: [],
  disassembly: [],
  
  // Array of objects { id, timestamp, message, type }
  systemLogs: [],
  
  // Windows Management
  showSystemLog: false,
  
  // View Control
  viewStartAddress: null,
  
  // History
  historyPast: [],
  historyFuture: [],
  
  // Selection
  selectedAddresses: [], 
  lastSelectedAddress: null, 
  
  // Patching
  modifiedAddresses: [], 

  // User customizations
  userComments: {}, 
  
  // Settings
  settings: {
    showGdbComments: true,
    swapArguments: true, 
    copyHexFormat: 'raw', 
    registerNaming: 'plain', 
    listingCase: 'upper', 
    numberFormat: 'auto', 
    negativeFormat: 'signed',
  },
};

export const debuggerSlice = createSlice({
  name: 'debugger',
  initialState,
  reducers: {
    resetDebuggerState: (state) => {
        state.status = 'IDLE';
        state.currentThreadId = null;
        state.registers = [];
        state.disassembly = [];
        state.viewStartAddress = null;
        state.historyPast = [];
        state.historyFuture = [];
        state.selectedAddresses = [];
        state.lastSelectedAddress = null;
        state.modifiedAddresses = [];
        state.userComments = {};
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setThreadId: (state, action) => {
        state.currentThreadId = action.payload;
    },
    updateRegisters: (state, action) => {
      state.registers = action.payload;
    },
    updateDisassembly: (state, action) => {
      state.disassembly = action.payload.map(item => ({
          ...item,
          address: normalizeAddress(item.address)
      }));
      if (!state.viewStartAddress && action.payload.length > 0) {
          state.viewStartAddress = normalizeAddress(action.payload[0].address);
      }
    },
    addSystemLog: (state, action) => {
      // payload is expected to be object { timestamp, message, type }
      if (state.systemLogs.length > 2000) state.systemLogs.shift();
      const entry = {
          id: Date.now() + Math.random(),
          timestamp: action.payload.timestamp || new Date().toLocaleTimeString(),
          message: action.payload.message || action.payload, // fallback for string
          type: action.payload.type || 'info'
      };
      state.systemLogs.push(entry);
    },
    clearSystemLogs: (state) => {
      state.systemLogs = [];
    },
    toggleSystemLogWindow: (state, action) => {
        state.showSystemLog = action.payload !== undefined ? action.payload : !state.showSystemLog;
    },
    
    // View & History
    setViewStartAddress: (state, action) => {
        state.viewStartAddress = normalizeAddress(action.payload);
    },
    pushHistory: (state, action) => {
        const addr = normalizeAddress(action.payload);
        if (state.historyPast.length === 0 || state.historyPast[state.historyPast.length - 1] !== addr) {
            state.historyPast.push(addr);
        }
        state.historyFuture = []; 
    },
    navigateBack: (state) => {
        if (state.historyPast.length > 0) {
            const current = state.viewStartAddress;
            const prev = state.historyPast.pop();
            state.historyFuture.push(current);
            state.viewStartAddress = prev;
        }
    },
    navigateForward: (state) => {
        if (state.historyFuture.length > 0) {
            const current = state.viewStartAddress;
            const next = state.historyFuture.pop();
            state.historyPast.push(current);
            state.viewStartAddress = next;
        }
    },
    clearHistory: (state) => {
        state.historyPast = [];
        state.historyFuture = [];
    },

    // Selection Logic
    selectAddress: (state, action) => {
        const addr = normalizeAddress(action.payload);
        state.selectedAddresses = [addr];
        state.lastSelectedAddress = addr;
    },
    toggleAddressSelection: (state, action) => {
        const addr = normalizeAddress(action.payload);
        if (state.selectedAddresses.includes(addr)) {
            state.selectedAddresses = state.selectedAddresses.filter(a => a !== addr);
        } else {
            state.selectedAddresses.push(addr);
        }
        state.lastSelectedAddress = addr;
    },
    selectAddressRange: (state, action) => {
        state.selectedAddresses = action.payload.map(normalizeAddress);
    },
    
    // Patching
    markAddressModified: (state, action) => {
        const payload = action.payload;
        if (Array.isArray(payload)) {
            payload.forEach(rawAddr => {
                const addr = normalizeAddress(rawAddr);
                if (!state.modifiedAddresses.includes(addr)) state.modifiedAddresses.push(addr);
            });
        } else {
            const addr = normalizeAddress(payload);
            if (!state.modifiedAddresses.includes(addr)) {
                state.modifiedAddresses.push(addr);
            }
        }
    },
    removePatch: (state, action) => {
        const addr = normalizeAddress(action.payload);
        state.modifiedAddresses = state.modifiedAddresses.filter(a => a !== addr);
    },
    setPatches: (state, action) => {
        state.modifiedAddresses = (action.payload || []).map(normalizeAddress);
    },
    
    setUserComment: (state, action) => {
      const { address, comment } = action.payload;
      const normAddr = normalizeAddress(address);
      if (comment === null || comment === '') {
        delete state.userComments[normAddr];
      } else {
        state.userComments[normAddr] = comment;
      }
    },
    setComments: (state, action) => {
        const normalized = {};
        if (action.payload) {
            Object.keys(action.payload).forEach(k => {
                normalized[normalizeAddress(k)] = action.payload[k];
            });
        }
        state.userComments = normalized;
    },
    updateSettings: (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
    },
  },
});

export const { 
  resetDebuggerState,
  setStatus, setThreadId, updateRegisters, updateDisassembly, 
  addSystemLog, clearSystemLogs, toggleSystemLogWindow,
  selectAddress, toggleAddressSelection, selectAddressRange, 
  setUserComment, setComments, updateSettings,
  setViewStartAddress, pushHistory, navigateBack, navigateForward, clearHistory,
  markAddressModified, removePatch, setPatches
} = debuggerSlice.actions;
export default debuggerSlice.reducer;
