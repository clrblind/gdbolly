import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    markAddressModified, removePatch, setUserComment, addSystemLog
} from '../store/debuggerSlice';
import { offsetAddress } from '../utils/addressUtils';

export const usePatcher = (apiCall, setActiveModal, refreshDisassembly) => {
    const dispatch = useDispatch();

    // Selectors
    const disassembly = useSelector(state => state.debug.disassembly);
    const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
    const modifiedAddresses = useSelector(state => state.debug.modifiedAddresses);
    const userComments = useSelector(state => state.debug.userComments);
    const viewStartAddress = useSelector(state => state.debug.viewStartAddress);

    // State
    const [commentInput, setCommentInput] = useState("");
    const [patchInput, setPatchInput] = useState({ hex: '', ascii: '', unicode: '' });
    const [fillByte, setFillByte] = useState("");
    const fillInputRef = useRef(null);

    const handleRevert = async () => {
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
                const hexPayload = payloadBytes.map(b => "0x" + b.toString(16).padStart(2, '0'));
                const res = await apiCall('/memory/write', { address: p.address, bytes: hexPayload });

                if (res && res.status === 'written') {
                    successCount++;
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

    return {
        commentInput, setCommentInput,
        patchInput, setPatchInput,
        fillByte, setFillByte, fillInputRef,
        handleRevert,
        openCommentModal, openEditModal,
        handleCommentOk, handleEditOk, handleFillOk, performPatch
    };
};
