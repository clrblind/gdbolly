import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setStatus, updateRegisters, updateDisassembly, addLog } from './store/debuggerSlice';
import { Container, Panel, Toolbar } from './components/Layout';
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

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'status') dispatch(setStatus(msg.payload));
      if (msg.type === 'registers') dispatch(updateRegisters(msg.payload));
      if (msg.type === 'disassembly') dispatch(updateDisassembly(msg.payload));
      
      // Логгируем все для отладки
      // dispatch(addLog(msg)); 
    };

    return () => ws.current.close();
  }, [dispatch]);

  const apiCall = async (endpoint) => {
    try {
        await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
    } catch(e) { console.error(e); }
  };

  return (
    <div>
      <Toolbar>
        <div style={{ marginRight: '20px', fontWeight: 'bold' }}>Web-OllyDbg</div>
        <button onClick={() => apiCall('/session/load')}>Reload / Restart</button>
        {/* Step Into отправляет команду step_into, которую мы добавим в бэк позже, пока run */}
        <button onClick={() => apiCall('/control/step_into')}>Step Into (F7)</button>
        <button onClick={() => apiCall('/control/step_over')}>Step Over (F8)</button>
        <div style={{ marginLeft: 'auto', color: status === 'PAUSED' ? 'red' : 'green' }}>
          {status}
        </div>
      </Toolbar>

      <Container>
        {/* Top Left: Disassembly */}
        <Panel>
          <DisassemblyPane />
        </Panel>

        {/* Top Right: Registers */}
        <Panel>
          <RegistersPane />
        </Panel>

        {/* Bottom Left: Dump (Placeholder) */}
        <Panel>
           <div>Memory Dump (Pending...)</div>
        </Panel>

        {/* Bottom Right: Stack (Placeholder) */}
        <Panel>
           <div>Stack (Pending...)</div>
        </Panel>
      </Container>
    </div>
  );
}

export default App;