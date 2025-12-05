
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { pushHistory, navigateBack, navigateForward, setViewStartAddress, toggleSystemLogWindow } from '../store/debuggerSlice';
import { normalizeAddress } from '../utils/addressUtils';

export const useDebuggerControl = (apiCall, setActiveModal) => {
    const dispatch = useDispatch();
    const registers = useSelector(state => state.debug.registers);
    const viewStartAddress = useSelector(state => state.debug.viewStartAddress);
    const showSystemLog = useSelector(state => state.debug.showSystemLog);

    const getCurrentIP = () => {
        // 1. Try by name (Most reliable)
        const named = registers.find(r => r.name === 'rip' || r.name === 'eip');
        if (named) return normalizeAddress(named.value);

        // 2. Fallback by number
        // Check 16 (RIP) first, as 8 (R8) exists in 64-bit and is NOT IP.
        // In 32-bit, 16 might be st0, so this is risky without names, 
        // but names should always be available now.
        const r16 = registers.find(r => r.number === '16');
        if (r16) return normalizeAddress(r16.value);

        const r8 = registers.find(r => r.number === '8');
        if (r8) return normalizeAddress(r8.value);

        return null;
    };

    const handleStep = async (type) => {
        const ip = getCurrentIP();
        if (ip) dispatch(pushHistory(ip));
        await apiCall(`/control/${type}`);
    };

    const handleGoTo = (addr) => {
        const norm = normalizeAddress(addr);
        if (norm) {
            dispatch(pushHistory(viewStartAddress));
            dispatch(setViewStartAddress(norm));
            setActiveModal(null);
        }
    };

    const handleJumpToRIP = () => {
        const ip = getCurrentIP();
        if (ip) {
            dispatch(pushHistory(viewStartAddress));
            dispatch(setViewStartAddress(ip));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'g') {
                e.preventDefault();
                setActiveModal('goto');
            }
            if (e.altKey && (e.key === 'c' || e.key === 'C')) {
                // Focus CPU / Disassembly
                e.preventDefault();
                dispatch(toggleSystemLogWindow(false));
            }
            if (e.code === 'NumpadSubtract') dispatch(navigateBack());
            if (e.code === 'NumpadAdd') dispatch(navigateForward());
            if (e.code === 'NumpadMultiply') {
                e.preventDefault();
                handleJumpToRIP();
            }
            if (e.code === 'F7') { e.preventDefault(); handleStep('step_into'); }
            if (e.code === 'F8') { e.preventDefault(); handleStep('step_over'); }
            if (e.code === 'F9') { e.preventDefault(); apiCall('/control/run'); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewStartAddress, registers, showSystemLog]);

    return {
        handleStep,
        handleGoTo,
        getCurrentIP
    };
};
