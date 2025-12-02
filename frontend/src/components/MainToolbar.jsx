
import React from 'react';
import { Toolbar } from './Layout';

const MainToolbar = ({ handleSessionLoad, handleStep, apiCall, setActiveModal, toggleLogs }) => {
  return (
    <Toolbar>
        <button onClick={handleSessionLoad} title="Reload binary">⏮</button>
        <button onClick={() => toggleLogs(false)} title="CPU (Disassembly, Registers, Dump, Stack)">CPU</button>
        <button onClick={() => handleStep('step_into')} title="Step Into (F7)">Step Into</button>
        <button onClick={() => handleStep('step_over')} title="Step Over (F8)">Step Over</button>
        <button onClick={() => apiCall('/control/run')} title="Run (F9)">Run</button>
        <button title="Pause (F12)">Pause</button>
        <button onClick={() => toggleLogs(true)} title="Show System Log">System Log</button>
    </Toolbar>
  );
};

export default MainToolbar;
