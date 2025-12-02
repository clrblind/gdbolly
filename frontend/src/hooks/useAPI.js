
import { useDispatch } from 'react-redux';
import { addSystemLog } from '../store/debuggerSlice';

const API_URL = `/api`; 

export const useAPI = () => {
    const dispatch = useDispatch();

    const apiCall = async (endpoint, body = null, method = 'POST', log = true) => {
        if (log && method !== 'GET') {
            dispatch(addSystemLog({ 
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
                dispatch(addSystemLog({
                    message: `RES: ${JSON.stringify(json)}`,
                    type: 'info'
                }));
            }
            return json;
        } catch(e) { 
            console.error(e); 
            if (log) {
                dispatch(addSystemLog({
                    message: `[ERR] ${e.message}`,
                    type: 'error'
                }));
            }
            return null; 
        }
    };

    return { apiCall };
};
