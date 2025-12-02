
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
    setStatus, setThreadId, updateRegisters, updateDisassembly, addSystemLog 
} from '../store/debuggerSlice';

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`;

export const useSocket = () => {
    const dispatch = useDispatch();
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket(WS_URL);
        ws.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'status') dispatch(setStatus(msg.payload));
            if (msg.type === 'thread-update') dispatch(setThreadId(msg.payload));
            if (msg.type === 'registers') dispatch(updateRegisters(msg.payload));
            if (msg.type === 'disassembly') dispatch(updateDisassembly(msg.payload));
            if (msg.type === 'system_log') dispatch(addSystemLog(`[LOG] ${msg.payload}`));
          } catch (e) {
            console.error("WS Parse error", e);
          }
        };
        
        ws.current.onclose = () => {
            // Optional: Reconnect logic could go here
        };

        return () => { if (ws.current) ws.current.close(); };
      }, [dispatch]);
};
