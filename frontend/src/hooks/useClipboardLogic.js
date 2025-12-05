import { useDispatch, useSelector } from 'react-redux';
import { addSystemLog } from '../store/debuggerSlice';
import { parseInstruction } from '../utils/asmFormatter';

export const useClipboardLogic = () => {
    const dispatch = useDispatch();
    const disassembly = useSelector(state => state.debug.disassembly);
    const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
    const userComments = useSelector(state => state.debug.userComments);
    const settings = useSelector(state => state.debug.settings);

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

    return {
        performCopy
    };
};
