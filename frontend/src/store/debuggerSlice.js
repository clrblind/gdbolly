import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'IDLE', // IDLE, RUNNING, PAUSED, EXITED
  currentThreadId: null,
  registers: [],
  disassembly: [],
  logs: [],
  
  // View Control
  viewStartAddress: null, // The top address of the current view
  
  // History
  historyPast: [], // Stack of addresses [addr1, addr2]
  historyFuture: [], // Stack of addresses
  
  // Selection
  selectedAddresses: [], 
  lastSelectedAddress: null, 
  
  // Patching
  modifiedAddresses: [], // List of addresses that have been modified (for red highlight)

  // User customizations
  userComments: {}, 
  
  // Settings
  settings: {
    showGdbComments: true,
    swapArguments: true, // New setting: Swap operands (dst, src)
    copyHexFormat: 'raw', 
    registerNaming: 'plain', 
    listingCase: 'upper', // Default upper per classic Olly
    numberFormat: 'auto', 
  },
};

export const debuggerSlice = createSlice({
  name: 'debugger',
  initialState,
  reducers: {
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
      state.disassembly = action.payload;
      // If we don't have a view start, set it to the first received
      if (!state.viewStartAddress && action.payload.length > 0) {
          state.viewStartAddress = action.payload[0].address;
      }
    },
    addLog: (state, action) => {
      state.logs.push(action.payload);
    },
    
    // View & History
    setViewStartAddress: (state, action) => {
        state.viewStartAddress = action.payload;
    },
    pushHistory: (state, action) => {
        const addr = action.payload;
        // Don't push if it's same as top
        if (state.historyPast.length === 0 || state.historyPast[state.historyPast.length - 1] !== addr) {
            state.historyPast.push(addr);
        }
        state.historyFuture = []; // Clear future on new branch
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

    // Selection Logic
    selectAddress: (state, action) => {
        const addr = action.payload;
        state.selectedAddresses = [addr];
        state.lastSelectedAddress = addr;
    },
    toggleAddressSelection: (state, action) => {
        const addr = action.payload;
        if (state.selectedAddresses.includes(addr)) {
            state.selectedAddresses = state.selectedAddresses.filter(a => a !== addr);
        } else {
            state.selectedAddresses.push(addr);
        }
        state.lastSelectedAddress = addr;
    },
    selectAddressRange: (state, action) => {
        state.selectedAddresses = action.payload;
    },
    
    // Patching
    markAddressModified: (state, action) => {
        const addr = action.payload;
        if (!state.modifiedAddresses.includes(addr)) {
            state.modifiedAddresses.push(addr);
        }
    },
    
    setUserComment: (state, action) => {
      const { address, comment } = action.payload;
      if (comment === null || comment === '') {
        delete state.userComments[address];
      } else {
        state.userComments[address] = comment;
      }
    },
    updateSettings: (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
    },
  },
});

export const { 
  setStatus, setThreadId, updateRegisters, updateDisassembly, addLog, 
  selectAddress, toggleAddressSelection, selectAddressRange, 
  setUserComment, updateSettings,
  setViewStartAddress, pushHistory, navigateBack, navigateForward,
  markAddressModified
} = debuggerSlice.actions;
export default debuggerSlice.reducer;