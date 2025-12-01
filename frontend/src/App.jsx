import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setStatus, updateRegisters, updateDisassembly, 
  addLog, toggleShowGdbComments, setUserComment 
} from './store/debuggerSlice';
import { 
  MainContainer, Toolbar, MenuBar, MenuItem, StatusBar,
  Workspace, HorizontalSplit, Panel,
  VerticalResizer, HorizontalResizer
} from './components/Layout';
import RegistersPane from './components/RegistersPane';
import DisassemblyPane from './components/DisassemblyPane';
import ContextMenu from './components/ContextMenu';
import XPModal from './components/XPModal';

const API_URL = `/api`; 
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;

function App() {
  const dispatch = useDispatch();
  const ws = useRef(null);
  const status = useSelector(state => state.debug.status);
  const showGdbComments = useSelector(state => state.debug.settings.showGdbComments);
  const selectedAddress = useSelector(state => state.debug.selectedAddress);
  
  // Layout State
  const [topHeightPercent, setTopHeightPercent] = useState(65);
  const [leftWidthPercent, setLeftWidthPercent] = useState(65);
  
  // Interaction State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, items }
  const [activeModal, setActiveModal] = useState(null); // 'options' | 'comment'
  const [commentInput, setCommentInput] = useState("");

  const isDraggingHorz = useRef(false);
  const isDraggingVert = useRef(false);

  // Global Key Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === ';') {
            if (selectedAddress) {
                e.preventDefault();
                setCommentInput(""); 
                setActiveModal('comment');
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAddress]);

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

  // --- Context Menu Logic ---
  const handleDisasmContextMenu = (e, inst) => {
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
              { label: 'Comment', hotkey: ';', action: () => { setCommentInput(""); setActiveModal('comment'); } },
              { label: 'Assemble', hotkey: 'Space', action: () => alert('Assemble not impl'), separator: true },
              { label: 'Copy line', action: () => navigator.clipboard.writeText(`${inst.address} ${inst.inst}`) },
              { label: 'Copy address', action: () => navigator.clipboard.writeText(inst.address) },
              { label: 'Copy...', action: () => {}, separator: true }, // Submenus not impl, simplified
              { label: 'Copy hex', action: () => navigator.clipboard.writeText(inst.opcodes || "") },
              { label: 'Copy asm', action: () => navigator.clipboard.writeText(inst.inst || "") },
          ]
      });
  };

  // --- Modal Logic ---
  const handleOptionsOk = () => {
    setActiveModal(null);
  };

  const handleCommentOk = () => {
      if (selectedAddress) {
          dispatch(setUserComment({ address: selectedAddress, comment: commentInput }));
      }
      setActiveModal(null);
  };

  return (
    <MainContainer>
      <MenuBar>
        <MenuItem>File</MenuItem>
        <MenuItem>View</MenuItem>
        <MenuItem>Debug</MenuItem>
        <MenuItem>Plugins</MenuItem>
        <MenuItem onClick={() => setActiveModal('options')}>Options</MenuItem>
        <MenuItem>Window</MenuItem>
        <MenuItem>Help</MenuItem>
      </MenuBar>

      <Toolbar>
        <button onClick={() => apiCall('/session/load')} title="Reload binary">⏮</button>
        <button onClick={() => apiCall('/control/step_into')} title="Step Into (F7)">Step Into</button>
        <button onClick={() => apiCall('/control/step_over')} title="Step Over (F8)">Step Over</button>
        <button onClick={() => apiCall('/control/run')} title="Run (F9)">Run</button>
        <button title="Pause (F12)">Pause</button>
      </Toolbar>

      <Workspace>
        {/* Top Section */}
        <HorizontalSplit style={{ height: `${topHeightPercent}%` }}>
          <Panel style={{ width: `${leftWidthPercent}%` }}>
            <DisassemblyPane onContextMenu={handleDisasmContextMenu} />
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

      <StatusBar>
        <div style={{width: '80px'}}>{status}</div>
        <div style={{flex: 1}}>Target: hello.exe</div>
        <div style={{width: '100px'}}>Thread: 1234</div>
      </StatusBar>

      {/* Context Menu */}
      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            items={contextMenu.items} 
            onClose={() => setContextMenu(null)} 
          />
      )}

      {/* Modals */}
      {activeModal === 'options' && (
          <XPModal title="Options" onClose={() => setActiveModal(null)} onOk={handleOptionsOk}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                  <label>
                      <input 
                        type="checkbox" 
                        checked={showGdbComments} 
                        onChange={(e) => dispatch(toggleShowGdbComments(e.target.checked))}
                      /> 
                      Show GDB comments
                  </label>
                  <label><input type="checkbox" disabled /> Show syntax highlighting</label>
                  <label><input type="checkbox" disabled /> Show jump path</label>
              </div>
          </XPModal>
      )}

      {activeModal === 'comment' && (
          <XPModal title="Add Comment" onClose={() => setActiveModal(null)} onOk={handleCommentOk}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                 <label>Address: {selectedAddress}</label>
                 <input 
                    autoFocus
                    type="text" 
                    value={commentInput} 
                    onChange={(e) => setCommentInput(e.target.value)} 
                    style={{width: '250px'}}
                 />
             </div>
          </XPModal>
      )}
    </MainContainer>
  );
}

export default App;