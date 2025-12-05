import React from 'react';
import styled from 'styled-components';

const Toolbar = styled.div`
  height: 28px;
  background: #d4d0c8;
  border-bottom: 1px solid #808080;
  display: flex;
  align-items: center;
  padding: 0 5px;
  gap: 2px;
`;

const ToolButton = styled.button`
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px outset #fff;
  background: #d4d0c8;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  
  &:active {
    border: 1px inset #fff;
  }
  
  &:disabled {
    color: #808080;
    cursor: default;
  }
`;

const Separator = styled.div`
  width: 20px;
  height: 20px;
  /* border-left: 1px solid #808080; */
  /* border-right: 1px solid #fff; */
  margin: 0 2px;
`;

const MainToolbar = ({ handleSessionLoad, handleFileOpen, handleCloseTarget, handleStep, apiCall, openLogWindow, openDebugLogWindow, focusDisassembly, setActiveModal }) => {

  const handleRun = () => apiCall('/control/run', {}, 'POST');
  const handlePause = () => apiCall('/control/pause', {}, 'POST');

  return (
    <Toolbar>
      <ToolButton onClick={() => setActiveModal('file_browser')} title="Open file">📂</ToolButton>
      <ToolButton onClick={handleSessionLoad} title="Restart target">↻</ToolButton>
      <ToolButton onClick={handleCloseTarget} title="Close target">X</ToolButton>
      <Separator />
      <ToolButton onClick={handleRun} title="Run (F9)">▶</ToolButton>
      <ToolButton onClick={handlePause} title="Pause (F12)">⏸</ToolButton>
      <ToolButton onClick={() => handleStep('step_into')} title="Step Into (F7)">⤵</ToolButton>
      <ToolButton onClick={() => handleStep('step_over')} title="Step Over (F8)">↷</ToolButton>
      <Separator />
      <ToolButton onClick={focusDisassembly} title="CPU Window (C)">C</ToolButton>
      <ToolButton onClick={openDebugLogWindow} title="Log Window (L)">L</ToolButton>
      <ToolButton onClick={openLogWindow} title="System Log (S)">S</ToolButton>
      <ToolButton onClick={() => setActiveModal('options')} title="Options (O)">O</ToolButton>
    </Toolbar>
  );
};

export default MainToolbar;
