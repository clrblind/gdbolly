
// Helper regex string for registers
export const REG_PATTERN = "eax|ebx|ecx|edx|esi|edi|esp|ebp|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r8|r9|r10|r11|r12|r13|r14|r15|rip|eip|al|ah|bl|bh|cl|ch|dl|dh|cs|ds|es|fs|gs|ss";

// Map for Register ID/Number to Name, and vice-versa if needed.
// GDB often sends register numbers.
export const REG_NAMES = {
    "0": "RAX", "1": "RBX", "2": "RCX", "3": "RDX", "4": "RSI", "5": "RDI", 
    "6": "RBP", "7": "RSP", "16": "RIP", "17": "EFLAGS"
};

export const applyCase = (text, mode) => {
    return mode === 'upper' ? text.toUpperCase() : text.toLowerCase();
};

export const formatNumber = (text, settings) => {
    // Regex: Optional $, Optional -, 0x, Hex digits
    return text.replace(/(\$)?(-)?0x([0-9a-fA-F]+)/gi, (match, prefix, sign, hex) => {
        let val = parseInt(hex, 16);
        if (isNaN(val)) return match;
        
        let isNegative = sign === '-';
        let finalVal = isNegative ? -val : val;

        // Handle Negative Formatting (Unsigned)
        if (isNegative && settings.negativeFormat === 'unsigned') {
            // Assume 64-bit 2's complement mask
            const bigVal = BigInt(finalVal) & 0xFFFFFFFFFFFFFFFFn;
            const result = '0x' + bigVal.toString(16);
            const resultCased = applyCase(result, settings.listingCase);
            return (settings.numberFormat === 'auto' ? (prefix || '') : '') + resultCased;
        }

        const absVal = Math.abs(finalVal);
        let formatted = '';
        
        switch(settings.numberFormat) {
            case 'hex_clean': // 0xA
                formatted = `0x${absVal.toString(16)}`;
                formatted = applyCase(formatted, settings.listingCase);
                break;
            case 'hex_asm': // 0Ah
                formatted = `${absVal.toString(16)}h`;
                formatted = applyCase(formatted, settings.listingCase);
                if (formatted.match(/^[a-fA-F]/)) formatted = '0' + formatted;
                break;
            case 'dec': // 10
                formatted = absVal.toString(10);
                break;
            default: // auto ($0xA)
                formatted = `0x${absVal.toString(16)}`; 
                if (settings.listingCase === 'upper') {
                    formatted = formatted.toUpperCase().replace('0X', '0x');
                } else {
                    formatted = formatted.toLowerCase();
                }
                break;
        }

        if (isNegative && settings.numberFormat !== 'auto') { 
           formatted = '-' + formatted;
        } else if (isNegative && settings.numberFormat === 'auto') {
           formatted = '-' + formatted;
        }

        if (settings.numberFormat === 'auto') {
            return (prefix || '') + formatted;
        } else {
            return formatted;
        }
    });
};

export const parseInstruction = (instData, settings) => {
    let rawInst = instData.inst || "";
    let mnemonic = "";
    let operands = "";
    let gdbComment = "";

    const commentSplit = rawInst.split('#');
    let codePart = commentSplit[0].trim();
    if (commentSplit.length > 1) {
        gdbComment = commentSplit.slice(1).join('#').trim();
    }

    const spaceIdx = codePart.indexOf(' ');
    if (spaceIdx === -1) {
        mnemonic = codePart;
    } else {
        mnemonic = codePart.substring(0, spaceIdx);
        operands = codePart.substring(spaceIdx).trim(); 
    }

    mnemonic = applyCase(mnemonic, settings.listingCase);
    operands = applyCase(operands, settings.listingCase);
    
    // Register Naming
    operands = operands.replace(/%/g, ''); // strip first
    if (settings.registerNaming === 'percent') {
        const regRe = new RegExp(`\\b(${REG_PATTERN})\\b`, 'gi');
        operands = operands.replace(regRe, '%$1');
    }

    operands = formatNumber(operands, settings);

    // Swap Arguments (Smart splitting)
    // Only split by comma if it's NOT inside parentheses
    if (settings.swapArguments) {
        let parts = [];
        let buffer = "";
        let parenDepth = 0;
        
        for (let char of operands) {
            if (char === '(') parenDepth++;
            if (char === ')') parenDepth--;
            
            if (char === ',' && parenDepth === 0) {
                parts.push(buffer.trim());
                buffer = "";
            } else {
                buffer += char;
            }
        }
        parts.push(buffer.trim());

        if (parts.length >= 2) {
             const op1 = parts[0];
             const rest = parts.slice(1).join(', '); // Join rest with space
             operands = `${rest},${op1}`;
        }
    }
    
    // Try to resolve relative jumps if gdbComment has an address
    // e.g., jmp 0x10 # 0x400500 <foo>
    // We want the instruction to show 0x400500
    if ((mnemonic.startsWith('j') || mnemonic.startsWith('call')) && gdbComment) {
        // Look for address in comment
        const match = gdbComment.match(/(0x[0-9a-fA-F]+)/);
        if (match) {
            const absAddr = match[1];
            // If the first operand is a small offset or relative, replace it
            // Check if operand is already absolute? Hard to tell.
            // But if user wants non-relative, we prefer the address from comment.
            if (operands.match(/^(-)?0x[0-9a-f]+$/) || operands.match(/^[0-9a-f]+h$/)) {
                 operands = absAddr;
            }
        }
    }

    return { mnemonic, operands, gdbComment };
};
