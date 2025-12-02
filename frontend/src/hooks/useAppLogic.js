
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings, setViewStartAddress } from '../store/debuggerSlice';
import { useAPI } from './useAPI';
import { useSocket } from './useSocket';
import { useLayout } from './useLayout';
import { useDebuggerControl } from './useDebuggerControl';
import { useMemory } from './useMemory';
import { normalizeAddress } from '../utils/addressUtils';

export const useAppLogic = () => {
  const dispatch = useDispatch();
  
  // Initialize Global Logic
  const { apiCall } = useAPI();
  useSocket(); // Hooks up listeners
  
  // Selectors needed for App.jsx
  const status = useSelector(state => state.debug.status);
  const settings = useSelector(state => state.debug.settings);
  const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
  const systemLogs = useSelector(state => state.debug.systemLogs);
  const currentThreadId = useSelector(state => state.debug.currentThreadId);
  const disassembly = useSelector(state => state.debug.disassembly);
  const registers = useSelector(state => state.debug.registers);
  const viewStartAddress = useSelector(state => state.debug.viewStartAddress);

  // Layout
  const { layout, handleMouseDownHorz, handleMouseDownVert } = useLayout();
  
  // Shared State for Modals (lifted up)
  // We need `setActiveModal` to be passed to both Control and Memory hooks
  // So we manage it here or passed down. To avoid circular deps, we use a simple useState here.
  const [activeModal, setActiveModal] = React_useState(null);

  // Debugger Control (Stepping, Running)
  const { 
      handleStep, handleGoTo, getCurrentIP 
  } = useDebuggerControl(apiCall, setActiveModal);

  // Memory Control (Disasm, Patching, Comments)
  const {
      contextMenu, setContextMenu,
      commentInput, setCommentInput,
      patchInput, setPatchInput,
      fillByte, setFillByte, fillInputRef,
      
      refreshDisassembly,
      handleSessionLoad,
      handleResetDB,
      handleCommentOk,
      handleEditOk,
      handleFillOk,
      handleDisasmContextMenu
  } = useMemory(apiCall, setActiveModal, getCurrentIP);

  // Settings Persistence
  const saveSetting = (key, value) => {
      dispatch(updateSettings({ [key]: value }));
      apiCall('/settings', { key, value }, 'POST', false); 
  };

  useEffect(() => {
      const loadSettings = async () => {
          const stored = await apiCall('/settings', null, 'GET', false);
          if (stored) {
              const parsedSettings = {};
              for (const [k, v] of Object.entries(stored)) {
                  if (v === 'true') parsedSettings[k] = true;
                  else if (v === 'false') parsedSettings[k] = false;
                  else parsedSettings[k] = v;
              }
              dispatch(updateSettings(parsedSettings));
          }
      };
      loadSettings();
  }, [dispatch]);

  // Sync View with IP on Pause
  useEffect(() => {
      if (status !== 'PAUSED') return;
      const ip = getCurrentIP();
      if (!ip) return;
      
      const inView = disassembly.some(i => i.address === ip);
      if (!inView && disassembly.length > 0) {
          dispatch(setViewStartAddress(ip));
      } else if (disassembly.length === 0) {
          dispatch(setViewStartAddress(ip));
      }
  }, [registers, status]);

  // Watch for start address changes to refresh view
  useEffect(() => {
      if (viewStartAddress) refreshDisassembly(viewStartAddress);
  }, [viewStartAddress]);

  return {
    // State
    status, settings, selectedAddresses, systemLogs,
    currentThreadId, layout, contextMenu, activeModal,
    commentInput, patchInput, fillByte, fillInputRef,
    
    // Setters
    setContextMenu, setActiveModal, setCommentInput, setPatchInput, setFillByte,
    
    // Handlers
    handleSessionLoad, handleResetDB, handleStep, handleGoTo,
    handleEditOk, handleFillOk, handleCommentOk,
    handleMouseDownHorz, handleMouseDownVert, handleDisasmContextMenu,
    
    apiCall,
    saveSetting,
    dispatch
  };
};

// Quick fix for the missing import in the extracted code block above
import { useState as React_useState } from 'react';
