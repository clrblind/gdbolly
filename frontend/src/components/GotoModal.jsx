
import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import XPModal from './XPModal';
import { REG_NAMES } from '../utils/asmFormatter';
import { normalizeAddress } from '../utils/addressUtils';

const GotoModal = ({ onClose, onOk }) => {
    const [val, setVal] = useState("");
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const registers = useSelector(state => state.debug.registers);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleOk = () => {
        // 1. Check if input matches a register name (rax, rbx, rip...)
        const clean = val.trim().toLowerCase();

        // Find register by name value from REG_NAMES map
        // REG_NAMES keys are IDs ("0"), values are Names ("RAX")
        let regId = Object.keys(REG_NAMES).find(key => REG_NAMES[key].toLowerCase() === clean);

        // Also check raw register names if not found in map (e.g. if GDB sends 'r15' and we don't have it mapped)
        if (!regId) {
            // Fallback: check if the input matches any 'r'+number logic or is in registers list 
            // But registers state only has numbers.
            // Let's rely on the map for standard regs or handle edge cases if needed.
        }

        if (regId) {
            const reg = registers.find(r => r.number === regId);
            if (reg) {
                const normRegVal = normalizeAddress(reg.value);
                onOk(normRegVal);
                return;
            }
        }

        // Also check if user typed a register that isn't in our ID map but is standard (e.g. 'eax' for 32-bit access on 'rax')
        // GDB usually returns 'rax'. If user types 'rax', we find it.
        // What if user types 'rip'?
        if (clean === 'rip' || clean === 'eip') {
            const r = registers.find(r => r.name === 'rip') ||
                registers.find(r => r.name === 'eip') ||
                (!registers.some(r => r.name) && registers.find(r => r.number === '16'));
            if (r) {
                onOk(normalizeAddress(r.value));
                return;
            }
        }

        // 2. Parse as Address
        let intVal = NaN;

        if (clean.endsWith('h')) {
            intVal = parseInt(clean.slice(0, -1), 16);
        } else if (clean.startsWith('0x')) {
            intVal = parseInt(clean, 16);
        } else {
            // If purely hex chars, assume hex
            if (/^[0-9a-f]+$/.test(clean)) {
                intVal = parseInt(clean, 16);
            } else {
                setError("Invalid address or register");
                return;
            }
        }

        if (isNaN(intVal)) {
            setError("Invalid format");
            return;
        }

        if (intVal < 0) {
            setError("Address cannot be negative");
            return;
        }

        const finalAddr = "0x" + intVal.toString(16).toLowerCase();
        onOk(finalAddr);
    };

    return (
        <XPModal title="Go to expression" onClose={onClose} onOk={handleOk}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '250px' }}>
                <label>Enter address to jump to:</label>
                <input
                    ref={inputRef}
                    type="text"
                    value={val}
                    onChange={e => { setVal(e.target.value); setError(null); }}
                />
                {error && <div style={{ color: 'red', fontSize: '10px' }}>{error}</div>}
                <div style={{ color: 'gray', fontSize: '10px' }}>Examples: 0x401000, 401000, rax, rip</div>
            </div>
        </XPModal>
    );
};

export default GotoModal;
