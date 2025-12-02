import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setStatus, updateRegisters, updateDisassembly, 
  setThreadId, setUserComment, updateSettings,
  setThreadId as setThreadIdAction,
  navigateBack, navigateForward, markAddressModified,
  setViewStartAddress, setComments, setPatches, removePatch,
  addSystemLog
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
  
  // State Selectors
  const status = useSelector(state => state.debug.status);
  const settings = useSelector(state => state.debug.settings);
  const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
  const disassembly = useSelector(state => state.debug.disassembly);
  const userComments = useSelector(state => state.debug.userComments);
  const currentThreadId = useSelector(state => state.debug.currentThreadId);
  const registers = useSelector(state => state.debug.registers);
  const viewStartAddress = useSelector(state => state.debug.viewStartAddress);
  const modifiedAddresses = useSelector(state => state.debug.modifiedAddresses);
  const systemLogs = useSelector(state => state.debug.systemLogs);

  // Layout State
  const [topHeightPercent, setTopHeightPercent] = useState(65);
  const [leftWidthPercent, setLeftWidthPercent] = useState(65);
  
  // Interaction State
  const [contextMenu, setContextMenu] = useState(null); 
  const [activeModal, setActiveModal] = useState(null); 
  const [commentInput, setCommentInput] = useState("");
  
  // Patching State
  const [patchInput, setPatchInput] = useState({ hex: '', ascii: '', unicode: '' });
  const [fillByte, setFillByte] = useState("00");

  const isDraggingHorz = useRef(false);
  const isDraggingVert = useRef(false);

  // --- Helpers ---
  const getCurrentIP = () => {
      const r = registers.find(r => r.number === '16' || r.number === 'rip' || r.number === 'eip');
      return r ? r.value : null;
  };
  
  const apiCall = async (endpoint, body = null, log = true) => {
    if (log) {
        const ts = new Date().toLocaleTimeString();
        dispatch(addSystemLog(`[${ts}] REQ: ${endpoint} ${body ? JSON.stringify(body) : ''}`));
    }
    try {
        const opts = { method: 'POST' };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(`${API_URL}${endpoint}`, opts);
        const json = await res.json();
        if (log) {
            const ts = new Date().toLocaleTimeString();
            dispatch(addSystemLog(`[${ts}] RES: ${JSON.stringify(json)}`));
        }
        return json;
    } catch(e) { 
        console.error(e); 
        if (log) dispatch(addSystemLog(`[ERR] ${e.message}`));
        return null; 
    }
  };

  const refreshDisassembly = (addr) => {
      // If addr provided, fetch around it. If not, fetch around IP.
      const target = addr || getCurrentIP();
      if (target) {
          apiCall('/memory/disassemble', { start: target, count: 100 }, false);
      }
  };

  const handleSessionLoad = async () => {
      const data = await apiCall('/session/load');
      if (data) {
          if (data.comments) dispatch(setComments(data.comments));
          if (data.patches) dispatch(setPatches(data.patches));
      }
  };

  const handleRevert = async () => {
      const toRevert = selectedAddresses.filter(addr => modifiedAddresses.includes(addr));
      if (toRevert.length === 0) return;
      
      for (let addr of toRevert) {
          await apiCall('/memory/revert', { address: addr });
          dispatch(removePatch(addr));
      }
      refreshDisassembly(viewStartAddress);
  };

  // --- Effects ---

  // Global Key Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
        // Alt+Backspace: Revert
        if (e.altKey && e.key === 'Backspace') {
            e.preventDefault();
            handleRevert();
            return;
        }

        if (e.key === ';') {
            if (selectedAddresses.length > 0) {
                e.preventDefault();
                openCommentModal();
            }
        }
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            if (selectedAddresses.length > 0) openEditModal();
        }
        // Numpad +/-
        if (e.code === 'NumpadSubtract') {
            dispatch(navigateBack());
        }
        if (e.code === 'NumpadAdd') {
            dispatch(navigateForward());
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAddresses, userComments, modifiedAddresses, viewStartAddress]);

  // View Start Change Effect
  useEffect(() => {
      if (viewStartAddress) {
          refreshDisassembly(viewStartAddress);
      }
  }, [viewStartAddress]);

  // WebSocket
  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
            dispatch(setStatus(msg.payload));
        }
        if (msg.type === 'thread-update') dispatch(setThreadIdAction(msg.payload));
        if (msg.type === 'registers') {
            dispatch(updateRegisters(msg.payload));
        }
        if (msg.type === 'disassembly') dispatch(updateDisassembly(msg.payload));
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    return () => {
        if (ws.current) ws.current.close();
    };
  }, [dispatch]);

  // Stabilize View Logic
  useEffect(() => {
      if (status !== 'PAUSED') return;
      const ip = getCurrentIP();
      if (!ip) return;
      
      const inView = disassembly.some(i => BigInt(i.address) === BigInt(ip));
      if (!inView && disassembly.length > 0) {
          dispatch(setViewStartAddress(ip));
      } else if (disassembly.length === 0) {
          dispatch(setViewStartAddress(ip));
      }
  }, [registers, status]);

  const openCommentModal = () => {
      const firstAddr = selectedAddresses[0];
      const existing = userComments[firstAddr] || "";
      setCommentInput(existing);
      setActiveModal('comment');
  };
  
  const openEditModal = () => {
      const selected = disassembly.filter(d => selectedAddresses.includes(d.address));
      if (selected.length > 0) {
          const bytes = selected[0].opcodes ? selected[0].opcodes.split(' ').join('') : '';
          setPatchInput({ hex: bytes, ascii: '.', unicode: '.' });
      }
      setActiveModal('edit');
  };

  const handleCopy = (text) => {
      if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text);
      } else {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
              document.execCommand('copy');
          } catch (err) {
              console.error('Fallback copy failed', err);
          }
          document.body.removeChild(textArea);
      }
  };

  const performCopy = (type, subFormat = null) => {
      let targets = selectedAddresses;
      if (targets.length === 0 && disassembly.length > 0) {
          targets = [disassembly[0].address]; 
      }

      const lines = disassembly.filter(i => targets.includes(i.address));
      let textToCopy = "";

      if (type === 'line') {
          textToCopy = lines.map(i => `${i.address}\t${i.opcodes || ''}\t${i.inst}`).join('\n');
      } else if (type === 'address') {
          textToCopy = lines.map(i => i.address).join('\n');
      } else if (type === 'asm') {
          textToCopy = lines.map(i => i.inst).join('\n');
      } else if (type === 'hex') {
          const format = subFormat || settings.copyHexFormat;
          textToCopy = lines.map(i => {
              const hex = i.opcodes || "";
              if (!hex) return "";
              const bytes = hex.split(' ').filter(x => x); 
              if (format === 'raw') return bytes.join('');
              if (format === 'space') return bytes.join(' ');
              if (format === 'prefix') return bytes.map(b => `0x${b}`).join(' ');
              if (format === 'python') return bytes.map(b => `\\x${b}`).join('');
              return hex;
          }).join(''); // Joined without newlines for hex dump
      }

      handleCopy(textToCopy);
  };
  
  const performPatch = async (bytes) => {
      const patches = [];
      disassembly.forEach(d => {
          if (selectedAddresses.includes(d.address)) {
              const len = d.opcodes ? d.opcodes.split(' ').filter(x=>x).length : 1;
              patches.push({ address: d.address, len });
          }
      });
      
      for (let p of patches) {
          let payloadBytes = [];
          if (bytes === 'NOP') {
               payloadBytes = Array(p.len).fill(0x90);
          } else {
               const b = parseInt(bytes, 16);
               if (isNaN(b)) continue;
               payloadBytes = Array(p.len).fill(b);
          }
          
          if (Array.isArray(bytes)) {
              if (p.address === selectedAddresses[0]) {
                  payloadBytes = bytes;
              } else {
                  continue; 
              }
          }

          if (payloadBytes.length > 0) {
              await apiCall('/memory/write', { address: p.address, bytes: payloadBytes });
              dispatch(markAddressModified(p.address));
          }
      }
      
      refreshDisassembly(viewStartAddress);
      setActiveModal(null);
  };

  const handleEditOk = () => {
      const raw = patchInput.hex.replace(/\s/g, '');
      const bytes = [];
      for (let i=0; i < raw.length; i+=2) {
          const val = parseInt(raw.substr(i, 2), 16);
          if (!isNaN(val)) {
            bytes.push(val);
          }
      }
      if (bytes.length > 0) {
        performPatch(bytes);
      }
  };

  const handleCommentOk = async () => {
      // Save to backend
      for (const addr of selectedAddresses) {
          await apiCall('/session/comment', { address: addr, comment: commentInput });
          dispatch(setUserComment({ address: addr, comment: commentInput }));
      }
      setActiveModal(null);
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

  // --- Context Menu ---
  const handleDisasmContextMenu = (e, inst) => {
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
              { label: 'Edit', hotkey: 'Ctrl+E', action: openEditModal },
              { 
                  label: 'Binary',
                  separator: true,
                  submenu: [
                      { label: "Fill with NOPs", action: () => performPatch('NOP') },
                      { label: "Fill with...", action: () => setActiveModal('fill') },
                      { label: "Revert", hotkey: "Alt+Back", action: handleRevert }
                  ]
              },
              { label: 'Comment', hotkey: ';', action: openCommentModal },
              { label: 'Copy line', hotkey: 'Ctrl+C', action: () => performCopy('line') },
              { label: 'Copy address', action: () => performCopy('address') },
              { 
                  label: 'Copy...', 
                  separator: true,
                  submenu: [
                      { label: 'Copy hex (Default)', action: () => performCopy('hex') },
                      { label: 'Copy hex (Raw)', action: () => performCopy('hex', 'raw') },
                      { label: 'Copy hex (Python)', action: () => performCopy('hex', 'python') },
                      { label: 'Copy asm', action: () => performCopy('asm') },
                  ]
              }, 
          ]
      });
  };

  return (
    <MainContainer>
      <MenuBar>
        <MenuItem>File</MenuItem>
        <MenuItem>View</MenuItem>
        <MenuItem>Debug</MenuItem>
        <MenuItem>Plugins</MenuItem>
        <MenuItem onClick={() => setActiveModal('options')}>Options</MenuItem>
        <MenuItem onClick={() => setActiveModal('logs')}>Window</MenuItem>
        <MenuItem>Help</MenuItem>
      </MenuBar>

      <Toolbar>
        <button onClick={handleSessionLoad} title="Reload binary">⏮</button>
        <button onClick={() => apiCall('/control/step_into')} title="Step Into (F7)">Step Into</button>
        <button onClick={() => apiCall('/control/step_over')} title="Step Over (F8)">Step Over</button>
        <button onClick={() => apiCall('/control/run')} title="Run (F9)">Run</button>
        <button title="Pause (F12)">Pause</button>
        <button onClick={() => setActiveModal('logs')}>System Log</button>
      </Toolbar>

      <Workspace>
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
        <div style={{width: '100px'}}>Thread: {currentThreadId || ''}</div>
      </StatusBar>

      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            items={contextMenu.items} 
            onClose={() => setContextMenu(null)} 
          />
      )}

      {activeModal === 'options' && (
          <XPModal title="Options" onClose={() => setActiveModal(null)} onOk={() => setActiveModal(null)}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <label>
                      <input 
                        type="checkbox" 
                        checked={settings.showGdbComments} 
                        onChange={(e) => dispatch(updateSettings({showGdbComments: e.target.checked}))}
                      /> 
                      Show GDB comments
                  </label>
                  <label>
                      <input 
                        type="checkbox" 
                        checked={settings.swapArguments} 
                        onChange={(e) => dispatch(updateSettings({swapArguments: e.target.checked}))}
                      /> 
                      Swap arguments (dst, src)
                  </label>
                  <label>Case: 
                      <select 
                        value={settings.listingCase}
                        onChange={(e) => dispatch(updateSettings({listingCase: e.target.value}))}
                      >
                          <option value="upper">UPPERCASE</option>
                          <option value="lower">lowercase</option>
                      </select>
                  </label>
                  <label>Register Naming: 
                      <select 
                        value={settings.registerNaming}
                        onChange={(e) => dispatch(updateSettings({registerNaming: e.target.value}))}
                      >
                          <option value="plain">Plain (eax)</option>
                          <option value="percent">GDB (%eax)</option>
                      </select>
                  </label>
                  <label>Copy Hex Format: 
                      <select 
                        value={settings.copyHexFormat}
                        onChange={(e) => dispatch(updateSettings({copyHexFormat: e.target.value}))}
                      >
                          <option value="raw">Raw (AABB)</option>
                          <option value="space">Space (AA BB)</option>
                          <option value="prefix">Prefix (0xAA)</option>
                          <option value="python">Python (\xAA)</option>
                      </select>
                  </label>
                  <label>Number Format: 
                      <select 
                        value={settings.numberFormat}
                        onChange={(e) => dispatch(updateSettings({numberFormat: e.target.value}))}
                      >
                          <option value="auto">Auto ($0xA)</option>
                          <option value="hex_clean">Hex (0xA)</option>
                          <option value="hex_asm">Asm (0Ah)</option>
                          <option value="dec">Decimal (10)</option>
                      </select>
                  </label>
                  <label>Negative Format: 
                      <select 
                        value={settings.negativeFormat}
                        onChange={(e) => dispatch(updateSettings({negativeFormat: e.target.value}))}
                      >
                          <option value="signed">Signed (-0xA)</option>
                          <option value="unsigned">Unsigned (FFFFFFF6)</option>
                      </select>
                  </label>
              </div>
          </XPModal>
      )}

      {activeModal === 'comment' && (
          <XPModal title="Add Comment" onClose={() => setActiveModal(null)} onOk={handleCommentOk}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                 <label>Address: {selectedAddresses[0] || '?'}</label>
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

      {activeModal === 'edit' && (
          <XPModal title="Edit Code" onClose={() => setActiveModal(null)} onOk={handleEditOk}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                 <label>Hex:</label>
                 <input type="text" value={patchInput.hex} onChange={e=>setPatchInput({...patchInput, hex: e.target.value})} style={{width: '250px'}} />
                 <label>ASCII:</label>
                 <input type="text" value={patchInput.ascii} readOnly style={{width: '250px', background: '#eee'}} />
                 <label>
                    <input type="checkbox" /> Keep size
                 </label>
             </div>
          </XPModal>
      )}

      {activeModal === 'fill' && (
          <XPModal title="Fill with byte" onClose={() => setActiveModal(null)} onOk={() => performPatch(fillByte)}>
             <label>Byte (Hex):</label>
             <input type="text" value={fillByte} onChange={e=>setFillByte(e.target.value)} maxLength={2} style={{width: '50px'}} />
          </XPModal>
      )}

      {activeModal === 'logs' && (
          <XPModal title="System Log" onClose={() => setActiveModal(null)} onOk={() => setActiveModal(null)}>
              <div style={{width: '500px', height: '300px', overflowY: 'auto', background: 'white', border: '1px solid gray', padding: '5px', fontFamily: 'monospace'}}>
                  {systemLogs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
          </XPModal>
      )}
    </MainContainer>
  );
}

export default App;