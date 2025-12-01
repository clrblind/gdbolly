import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setStatus, updateRegisters, updateDisassembly, addLog } from './store/debuggerSlice';
import { 
  MainContainer, Toolbar, MenuBar, MenuItem,
  Workspace, HorizontalSplit, Panel,
  VerticalResizer, HorizontalResizer
} from './components/Layout';
import RegistersPane from './components/RegistersPane';
import DisassemblyPane from './components/DisassemblyPane';

const hostname = window.location.hostname;
const API_URL = `/api`; 
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;

function App() {
  const dispatch = useDispatch();
  const ws = useRef(null);
  const status = useSelector(state => state.debug.status);
  
  // Layout State
  // We use percentages for splitters to handle window resizing gracefully
  const [topHeightPercent, setTopHeightPercent] = useState(65);
  const [leftWidthPercent, setLeftWidthPercent] = useState(65);
  
  // Resizing Refs
  const isDraggingHorz = useRef(false);
  const isDraggingVert = useRef(false);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') dispatch(setStatus(msg.payload));
        if (msg.type === 'registers') dispatch(updateRegisters(msg.payload));
        if (msg.type === 'disassembly') dispatch(updateDisassembly(msg.payload));
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    return () => {
        if (ws.current) ws.current.close();
    };
  }, [dispatch]);

  const apiCall = async (endpoint) => {
    try {
        await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
    } catch(e) { console.error(e); }
  };

  // --- Resizing Logic ---
  const handleMouseDownHorz = (e) => {
    e.preventDefault();
    isDraggingHorz.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownVert = (e) => {
    e.preventDefault();
    isDraggingVert.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isDraggingHorz.current) {
        const h = (e.clientY / window.innerHeight) * 100;
        setTopHeightPercent(Math.max(10, Math.min(90, h)));
    }
    if (isDraggingVert.current) {
        const w = (e.clientX / window.innerWidth) * 100;
        setLeftWidthPercent(Math.max(10, Math.min(90, w)));
    }
  };

  const handleMouseUp = () => {
    isDraggingHorz.current = false;
    isDraggingVert.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <MainContainer>
      <MenuBar>
        <MenuItem>File</MenuItem>
        <MenuItem>View</MenuItem>
        <MenuItem>Debug</MenuItem>
        <MenuItem>Plugins</MenuItem>
        <MenuItem>Options</MenuItem>
        <MenuItem>Window</MenuItem>
        <MenuItem>Help</MenuItem>
      </MenuBar>

      <Toolbar>
        <button onClick={() => apiCall('/session/load')} title="Reload binary">⏮</button>
        <button onClick={() => apiCall('/control/step_into')} title="Step Into (F7)">Step Into</button>
        <button onClick={() => apiCall('/control/step_over')} title="Step Over (F8)">Step Over</button>
        <button onClick={() => apiCall('/control/run')} title="Run (F9)">Run</button>
        <button title="Pause (F12)">Pause</button>
        <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: status === 'PAUSED' ? 'red' : 'green' }}>
          {status}
        </div>
      </Toolbar>

      <Workspace>
        {/* Top Section */}
        <HorizontalSplit style={{ height: `${topHeightPercent}%` }}>
          <Panel style={{ width: `${leftWidthPercent}%` }}>
            <DisassemblyPane />
          </Panel>
          <VerticalResizer onMouseDown={handleMouseDownVert} />
          <Panel style={{ flex: 1 }}>
            <RegistersPane />
          </Panel>
        </HorizontalSplit>

        <HorizontalResizer onMouseDown={handleMouseDownHorz} />

        {/* Bottom Section */}
        <HorizontalSplit style={{ flex: 1 }}>
          <Panel style={{ width: `${leftWidthPercent}%` }}>
             <div style={{padding: 5}}>Memory Dump (Pending...)</div>
          </Panel>
          <VerticalResizer onMouseDown={handleMouseDownVert} />
          <Panel style={{ flex: 1 }}>
             <div style={{padding: 5}}>Stack (Pending...)</div>
          </Panel>
        </HorizontalSplit>
      </Workspace>
    </MainContainer>
  );
}

export default App;