
import React, { useState, useEffect, useRef } from 'react';
import XPModal from './XPModal';

const GotoModal = ({ onClose, onOk }) => {
    const [val, setVal] = useState("");
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if(inputRef.current) inputRef.current.focus();
    }, []);

    const handleOk = () => {
        // Validation: 0x..., ...h, dec
        let clean = val.trim();
        let intVal = NaN;

        if (clean.endsWith('h') || clean.endsWith('H')) {
            intVal = parseInt(clean.slice(0, -1), 16);
        } else if (clean.startsWith('0x') || clean.startsWith('0X')) {
            intVal = parseInt(clean, 16);
        } else {
            // Try hex if assume hex, or dec? Olly assumes Hex usually
            // Let's check if valid hex chars
            if (/^[0-9a-fA-F]+$/.test(clean)) {
                 intVal = parseInt(clean, 16);
            } else {
                 setError("Invalid format");
                 return;
            }
        }

        if (isNaN(intVal)) {
            setError("Invalid address");
            return;
        }

        // Basic sanity check (optional, e.g. positive)
        if (intVal < 0) {
            setError("Address cannot be negative");
            return;
        }

        onOk("0x" + intVal.toString(16));
    };

    return (
        <XPModal title="Go to expression" onClose={onClose} onOk={handleOk}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '5px', width: '250px'}}>
                <label>Enter address to jump to:</label>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={val} 
                    onChange={e => {setVal(e.target.value); setError(null);}} 
                />
                {error && <div style={{color: 'red', fontSize: '10px'}}>{error}</div>}
                <div style={{color: 'gray', fontSize: '10px'}}>Examples: 0x401000, 401000, 401000h</div>
            </div>
        </XPModal>
    );
};

export default GotoModal;
