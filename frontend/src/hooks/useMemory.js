import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { offsetAddress } from '../utils/addressUtils';
import { useSessionManager } from './useSessionManager';
import { usePatcher } from './usePatcher';
import { useClipboardLogic } from './useClipboardLogic';

export const useMemory = (apiCall, setActiveModal, getCurrentIP) => {
    // Selectors
    const disassembly = useSelector(state => state.debug.disassembly);
    const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
    const modifiedAddresses = useSelector(state => state.debug.modifiedAddresses);
    const userComments = useSelector(state => state.debug.userComments);
    const viewStartAddress = useSelector(state => state.debug.viewStartAddress);

    const [contextMenu, setContextMenu] = useState(null);

    // 1. Session Logic
    const {
        targetName, handleSessionLoad, handleFileOpen, handleResetDB
    } = useSessionManager(apiCall);

    // Helper for Disassembly
    const refreshDisassembly = (addr) => {
        const target = addr || getCurrentIP();
        if (target) {
            apiCall('/memory/disassemble', { start: target, count: 100 }, 'POST', false);
        }
    };

    // 2. Patching Logic
    const {
        commentInput, setCommentInput,
        patchInput, setPatchInput,
        fillByte, setFillByte, fillInputRef,
        handleRevert,
        openCommentModal, openEditModal,
        handleCommentOk, handleEditOk, handleFillOk, performPatch
    } = usePatcher(apiCall, setActiveModal, refreshDisassembly);

    // 3. Clipboard Logic
    const { performCopy } = useClipboardLogic();

    // Context Menu
    const handleDisasmContextMenu = (e, inst) => {
        // Check if ANY byte in this instruction is modified
        const len = inst.opcodes ? inst.opcodes.split(' ').filter(x => x).length : 1;
        let isModified = false;
        for (let i = 0; i < len; i++) {
            if (modifiedAddresses.includes(offsetAddress(inst.address, i))) {
                isModified = true;
                break;
            }
        }

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
                        { label: "Fill with...", action: () => { setFillByte(""); setActiveModal('fill'); } },
                        ...(isModified ? [{ label: "Revert", hotkey: "Alt+Back", action: handleRevert }] : [])
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
                        { label: 'Offset', action: () => performCopy('offset') },
                    ]
                },
            ]
        });
    };

    // Hotkeys for Memory Actions
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'Backspace') {
                e.preventDefault();
                handleRevert();
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
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAddresses, modifiedAddresses, userComments, disassembly, viewStartAddress, handleRevert]);

    return {
        contextMenu, setContextMenu,
        commentInput, setCommentInput,
        patchInput, setPatchInput,
        fillByte, setFillByte, fillInputRef,
        targetName,

        refreshDisassembly,
        handleSessionLoad,
        handleFileOpen,
        handleResetDB,
        handleRevert,
        handleCommentOk,
        handleEditOk,
        handleFillOk,
        handleDisasmContextMenu
    };
};
