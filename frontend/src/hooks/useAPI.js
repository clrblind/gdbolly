
import { useDispatch } from 'react-redux';
import { addSystemLog } from '../store/debuggerSlice';

const API_URL = `/api`; 

export const useAPI = () => {
    const dispatch = useDispatch();

    const apiCall = async (endpoint, body = null, method = 'POST', log = true) => {
        const now = new Date();
        const ts = now.toLocaleTimeString('en-GB') + '.' + now.getMilliseconds().toString().padStart(3, '0');

        if (log && method !== 'GET') {
            dispatch(addSystemLog({ 
                timestamp: ts, 
                message: `REQ: ${endpoint} ${body ? JSON.stringify(body) : ''}`,
                type: 'info'
            }));
        }
        try {
            const opts = { method: method };
            if (body) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(body);
            }
            const res = await fetch(`${API_URL}${endpoint}`, opts);
            const json = await res.json();
            
            if (log && method !== 'GET') {
                const nowRes = new Date();
                const tsRes = nowRes.toLocaleTimeString('en-GB') + '.' + nowRes.getMilliseconds().toString().padStart(3, '0');
                
                dispatch(addSystemLog({
                    timestamp: tsRes,
                    message: `RES: ${JSON.stringify(json)}`,
                    type: 'info'
                }));
            }
            return json;
        } catch(e) { 
            console.error(e); 
            if (log) {
                dispatch(addSystemLog({
                    timestamp: ts,
                    message: `[ERR] ${e.message}`,
                    type: 'error'
                }));
            }
            return null; 
        }
    };

    return { apiCall };
};
