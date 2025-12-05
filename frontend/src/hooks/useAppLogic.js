
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings, setViewStartAddress, toggleSystemLogWindow } from '../store/debuggerSlice';
import { useAPI } from './useAPI';
import { useSocket } from './useSocket';
import { useLayout } from './useLayout';
import { useDebuggerControl } from './useDebuggerControl';
import { useMemory } from './useMemory';
import { normalizeAddress } from '../utils/addressUtils';

export const useAppLogic = () => {
    const dispatch = useDispatch();

    // Initialize Global Logic
    const { apiCall } = useAPI();
    useSocket();

    // Selectors
    const status = useSelector(state => state.debug.status);
    const settings = useSelector(state => state.debug.settings);
    const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
    const showSystemLog = useSelector(state => state.debug.showSystemLog);
    const currentThreadId = useSelector(state => state.debug.currentThreadId);
    const disassembly = useSelector(state => state.debug.disassembly);
    const registers = useSelector(state => state.debug.registers);
    const viewStartAddress = useSelector(state => state.debug.viewStartAddress);
    const loadingProgress = useSelector(state => state.debug.loadingProgress);
    const metadata = useSelector(state => state.debug.metadata);
    const [version, setVersion] = useState("0.0.0");

    // Layout
    const { layout, handleMouseDownHorz, handleMouseDownVert } = useLayout();

    // Shared State for Modals
    const [activeModal, setActiveModal] = useState(null);

    // Debugger Control
    const {
        handleStep, handleGoTo, getCurrentIP
    } = useDebuggerControl(apiCall, setActiveModal);

    // Memory Control
    const {
        contextMenu, setContextMenu,
        commentInput, setCommentInput,
        patchInput, setPatchInput,
        fillByte, setFillByte, fillInputRef,
        targetName,

        refreshDisassembly,
        handleSessionLoad,
        handleFileOpen,
        handleResetDB,
        handleCommentOk,
        handleEditOk,
        handleFillOk,
        handleDisasmContextMenu
    } = useMemory(apiCall, setActiveModal, getCurrentIP);

    // Helper
    const toggleLogs = () => dispatch(toggleSystemLogWindow());
    const focusDisassembly = () => {
        // Just ensure logs are closed or we just mean visual focus
        // If we had Z-index manager, we would lift it.
        // For now, if logs are covering, close them?
        // Or we can just set focus to the element (done in DisassemblyPane ref).
        if (showSystemLog) dispatch(toggleSystemLogWindow(false));
    };

    // Settings Persistence
    const saveSetting = (key, value) => {
        dispatch(updateSettings({ [key]: value }));
        apiCall('/settings', { key, value }, 'POST', false).then(() => {
            if (key === 'disassemblyFlavor') {
                refreshDisassembly(viewStartAddress);
            }
        });
    };

    useEffect(() => {
        const loadSettings = async () => {
            const stored = await apiCall('/settings', null, 'GET', false);
            if (stored) {
                const parsedSettings = {};
                for (const [k, v] of Object.entries(stored)) {
                    if (v === 'true') parsedSettings[k] = true;
                    else if (v === 'false') parsedSettings[k] = false;
                    else parsedSettings[k] = v;
                }
                dispatch(updateSettings(parsedSettings));
            }

            const verData = await apiCall('/version', null, 'GET', false);
            if (verData && verData.version) setVersion(verData.version);
        };
        loadSettings();
    }, [dispatch]);

    // Sync View with IP on Pause
    useEffect(() => {
        if (status !== 'PAUSED') return;
        const ip = getCurrentIP();
        if (!ip) return;

        const inView = disassembly.some(i => i.address === ip);
        if (!inView && disassembly.length > 0) {
            dispatch(setViewStartAddress(ip));
        } else if (disassembly.length === 0) {
            dispatch(setViewStartAddress(ip));
        }
    }, [registers, status]);

    // Watch for start address changes to refresh view
    useEffect(() => {
        if (viewStartAddress) refreshDisassembly(viewStartAddress);
    }, [viewStartAddress]);

    return {
        // State
        status, settings, selectedAddresses, showSystemLog,
        currentThreadId, layout, contextMenu, activeModal,
        commentInput, patchInput, fillByte, fillInputRef, targetName,
        loadingProgress, version, metadata,

        // Setters
        setContextMenu, setActiveModal, setCommentInput, setPatchInput, setFillByte,

        // Handlers
        handleSessionLoad, handleResetDB, handleStep, handleGoTo, handleFileOpen,
        handleEditOk, handleFillOk, handleCommentOk,
        handleMouseDownHorz, handleMouseDownVert, handleDisasmContextMenu,
        toggleLogs, focusDisassembly,

        apiCall,
        saveSetting,
        dispatch
    };
};
