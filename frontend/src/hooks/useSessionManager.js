import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    setComments, setPatches, resetDebuggerState, addSystemLog, setMetadata
} from '../store/debuggerSlice';

export const useSessionManager = (apiCall) => {
    const dispatch = useDispatch();
    const [targetName, setTargetName] = useState("");

    const handleSessionLoad = async () => {
        dispatch(resetDebuggerState());
        const data = await apiCall('/session/load');
        if (data) {
            if (data.error) {
                dispatch(addSystemLog({ message: `Error loading session: ${data.error}`, type: 'error' }));
                return;
            }
            if (data.comments) dispatch(setComments(data.comments));
            if (data.patches) dispatch(setPatches(data.patches));
            if (data.metadata) dispatch(setMetadata(data.metadata));
            // Target name stays the same on reload
        }
    };

    const handleFileOpen = async (path) => {
        dispatch(resetDebuggerState());
        dispatch(addSystemLog({ message: `Opening file: ${path}`, type: 'info' }));

        const data = await apiCall('/session/load', { path }, 'POST');

        if (data && data.error) {
            dispatch(addSystemLog({
                message: `Failed to open ${path}: ${data.error}`,
                type: 'error'
            }));
            alert(`Error: ${data.error}`);
            return;
        }

        if (data) {
            // Extract filename from path
            const fileName = path.split('/').pop();
            setTargetName(fileName);

            if (data.comments) dispatch(setComments(data.comments));
            if (data.patches) dispatch(setPatches(data.patches));
            dispatch(addSystemLog({
                message: `Successfully loaded ${path}`,
                type: 'info'
            }));
        }
    };

    const handleResetDB = async () => {
        dispatch(addSystemLog({ message: "Action: Reset Database", type: 'warning' }));
        await apiCall('/database/reset');
        handleSessionLoad();
    };

    return {
        targetName,
        handleSessionLoad,
        handleFileOpen,
        handleResetDB
    };
};
