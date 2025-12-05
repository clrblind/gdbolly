

import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    markAddressModified, removePatch, setComments, setPatches,
    setUserComment, resetDebuggerState, addSystemLog
} from '../store/debuggerSlice';
import { parseInstruction } from '../utils/asmFormatter';
import { normalizeAddress, offsetAddress } from '../utils/addressUtils';

const bytesToHex = (bytes) => {
    return "[" + bytes.map(b => "0x" + b.toString(16).padStart(2, '0')).join(", ") + "]";
};

export const useMemory = (apiCall, setActiveModal, getCurrentIP) => {
    const dispatch = useDispatch();

    // Selectors
    const disassembly = useSelector(state => state.debug.disassembly);
    const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
    const modifiedAddresses = useSelector(state => state.debug.modifiedAddresses);
    const userComments = useSelector(state => state.debug.userComments);
    const settings = useSelector(state => state.debug.settings);
    const viewStartAddress = useSelector(state => state.debug.viewStartAddress);

    // State
    const [contextMenu, setContextMenu] = useState(null);
    const [commentInput, setCommentInput] = useState("");
    const [patchInput, setPatchInput] = useState({ hex: '', ascii: '', unicode: '' });
    const [fillByte, setFillByte] = useState("");
    const [targetName, setTargetName] = useState("");
    const fillInputRef = useRef(null);

    const refreshDisassembly = (addr) => {
        const target = addr || getCurrentIP();
        if (target) {
            apiCall('/memory/disassemble', { start: target, count: 100 }, 'POST', false);
        }
    };

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

    const handleRevert = async () => {
        // Need to find which bytes are actually modified within the selection.
        // The backend `get_patches` returns a list of ALL modified bytes.
        // modifiedAddresses in Redux stores these bytes.

        let bytesToRevert = [];

        selectedAddresses.forEach(selAddr => {
            // Find instruction length to cover range
            const inst = disassembly.find(i => i.address === selAddr);
            if (inst) {
                const len = inst.opcodes ? inst.opcodes.split(' ').filter(x => x).length : 1;
                for (let i = 0; i < len; i++) {
                    const addr = offsetAddress(selAddr, i);
                    if (modifiedAddresses.includes(addr)) {
                        bytesToRevert.push(addr);
                    }
                }
            } else {
                // If not in disassembly (unlikely for selection), just check exact addr
                if (modifiedAddresses.includes(selAddr)) bytesToRevert.push(selAddr);
            }
        });

        // Deduplicate
        bytesToRevert = [...new Set(bytesToRevert)];

        if (bytesToRevert.length === 0) return;

        dispatch(addSystemLog(`Action: Revert ${bytesToRevert.length} bytes`));

        for (let addr of bytesToRevert) {
            const res = await apiCall('/memory/revert', { address: addr });
            if (res && res.status === 'reverted') {
                dispatch(removePatch(addr));
            }
        }
        refreshDisassembly(viewStartAddress);
    };

    const openCommentModal = () => {
        if (selectedAddresses.length === 0) return;
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

    const handleCommentOk = async () => {
        for (const addr of selectedAddresses) {
            await apiCall('/session/comment', { address: addr, comment: commentInput });
            dispatch(setUserComment({ address: addr, comment: commentInput }));
        }
        dispatch(addSystemLog(`Action: Added comment to ${selectedAddresses.join(', ')}: "${commentInput}"`));
        setActiveModal(null);
    };

    const performPatch = async (bytes) => {
        const patches = [];
        disassembly.forEach(d => {
            if (selectedAddresses.includes(d.address)) {
                const len = d.opcodes ? d.opcodes.split(' ').filter(x => x).length : 1;
                patches.push({ address: d.address, len });
            }
        });

        let successCount = 0;
        let totalModified = [];

        dispatch(addSystemLog(`Action: Patching ${patches.length} blocks`));

        for (let p of patches) {
            let payloadBytes = [];
            if (bytes === 'NOP') {
                // Fill with 0x90
                payloadBytes = Array(p.len).fill(0x90);
            } else {
                if (Array.isArray(bytes)) {
                    if (bytes.length === 1 && patches.length > 1) {
                        payloadBytes = Array(p.len).fill(bytes[0]);
                    } else if (p.address === selectedAddresses[0]) {
                        payloadBytes = bytes;
                    } else continue;
                } else {
                    continue;
                }
            }

            if (payloadBytes.length > 0) {
                // Convert to hex strings for consistency in logging (Requirement: REQ: ... bytes in hex)
                const hexPayload = payloadBytes.map(b => "0x" + b.toString(16).padStart(2, '0'));

                const res = await apiCall('/memory/write', { address: p.address, bytes: hexPayload });

                if (res && res.status === 'written') {
                    successCount++;
                    // Backend confirms write. We mark ALL individual bytes as modified.
                    for (let i = 0; i < payloadBytes.length; i++) {
                        totalModified.push(offsetAddress(p.address, i));
                    }
                }
            }
        }

        if (totalModified.length > 0) {
            dispatch(markAddressModified(totalModified));
            refreshDisassembly(viewStartAddress);
        }

        setActiveModal(null);
    };

    const handleEditOk = () => {
        const raw = patchInput.hex.replace(/\s/g, '');
        const bytes = [];
        for (let i = 0; i < raw.length; i += 2) {
            const val = parseInt(raw.substring(i, i + 2), 16);
            if (!isNaN(val)) bytes.push(val);
        }
        if (bytes.length > 0) performPatch(bytes);
    };

    const handleFillOk = () => {
        let val = fillByte.trim();
        let b = parseInt(val, 16);
        if (isNaN(b) || b > 255 || b < 0) { alert("Invalid byte"); return; }
        performPatch([b]);
    };

    // Copy Logic
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
            try { document.execCommand('copy'); } catch (err) { console.error(err); }
            document.body.removeChild(textArea);
        }
        dispatch(addSystemLog("Action: Copied to clipboard"));
    };

    const performCopy = (type, subFormat = null) => {
        let targets = selectedAddresses;
        if (targets.length === 0 && disassembly.length > 0) targets = [disassembly[0].address];

        const lines = disassembly.filter(i => targets.includes(i.address));
        let textToCopy = "";

        const processedLines = lines.map(inst => {
            const parsed = parseInstruction(inst, settings);
            let cmt = userComments[inst.address] || parsed.gdbComment || '';
            return { ...inst, ...parsed, comment: cmt };
        });

        if (type === 'line') textToCopy = processedLines.map(i => `${i.address}\t${i.opcodes || ''}\t${i.mnemonic} ${i.operands}\t${i.comment}`).join('\n');
        else if (type === 'address') textToCopy = processedLines.map(i => i.address).join('\n');
        else if (type === 'asm') textToCopy = processedLines.map(i => `${i.mnemonic} ${i.operands}`).join('\n');
        else if (type === 'offset') {
            textToCopy = processedLines.map(i => {
                const addr = BigInt(i.address);
                const offset = addr & 0xFFFFFFn;
                return '0x' + offset.toString(16);
            }).join('\n');
        } else if (type === 'hex') {
            const format = subFormat || settings.copyHexFormat;
            textToCopy = processedLines.map(i => {
                const hex = i.opcodes || "";
                if (!hex) return "";
                const bytes = hex.split(' ').filter(x => x);
                if (format === 'raw') return bytes.join('');
                if (format === 'space') return bytes.join(' ');
                if (format === 'prefix') return bytes.map(b => `0x${b}`).join(' ');
                if (format === 'python') return bytes.map(b => `\\x${b}`).join('');
                return hex;
            }).join('');
        }
        handleCopy(textToCopy);
    };

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
    }, [selectedAddresses, modifiedAddresses, userComments, disassembly, viewStartAddress]);

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
