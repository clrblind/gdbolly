
import { useDispatch } from 'react-redux';
import { addSystemLog } from '../store/debuggerSlice';

const API_URL = `/api`; 

export const useAPI = () => {
    const dispatch = useDispatch();

    const apiCall = async (endpoint, body = null, method = 'POST', log = true) => {
        if (log && method !== 'GET') {
            const ts = new Date().toLocaleTimeString();
            dispatch(addSystemLog(`[${ts}] REQ: ${endpoint} ${body ? JSON.stringify(body) : ''}`));
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

    return { apiCall };
};
