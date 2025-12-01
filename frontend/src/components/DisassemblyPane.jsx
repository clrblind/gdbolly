import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { 
    selectAddress, toggleAddressSelection, selectAddressRange, 
    pushHistory, setViewStartAddress 
} from '../store/debuggerSlice';

const PaneContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  cursor: default;
`;

const HeaderRow = styled.div`
  display: flex;
  background-color: #d4d0c8;
  border-bottom: 1px solid #808080;
  height: 20px;
  flex-shrink: 0;
  user-select: none;
`;

const HeaderCell = styled.div`
  border-right: 1px solid #808080;
  border-top: 1px solid white;
  border-left: 1px solid white;
  padding-left: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  position: relative;
  background-color: #d4d0c8;
  overflow: hidden;
  box-sizing: border-box;
`;

const ResizerHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  &:hover { background-color: rgba(0,0,0,0.1); }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: white;
  font-family: 'Consolas', monospace;
  font-size: 13px;
`;

const Row = styled.div`
  display: flex;
  white-space: pre;
  height: 16px;
  line-height: 16px;
  user-select: none; /* Prevents text selection on shift-click */
  
  background-color: ${props => 
    props.$selected ? '#000080' : 
    props.$modified ? '#000000' : 
    props.$current ? '#c0c0c0' : 'transparent'
  };
  
  color: ${props => 
    props.$selected ? '#ffffff' : 
    props.$modified ? '#ff0000' : 
    props.$current ? '#000000' : 'inherit'
  };

  &:hover {
    border: ${props => (!props.$selected && !props.$current && !props.$modified) ? '1px solid #000' : 'none'};
    margin: ${props => (!props.$selected && !props.$current && !props.$modified) ? '-1px' : '0'};
  }
`;

const Cell = styled.div`
  padding-left: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-right: 1px solid #d4d0c8;
  flex-shrink: 0;
  box-sizing: border-box;
`;

const Mnemonic = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : props.$isCall ? '#0000ff' : '#000'};
  font-weight: ${props => props.$isCall ? 'bold' : 'normal'};
`;

const Operands = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#000'};
`;

const CommentText = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#808080'};
`;

const HexDump = styled.div`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#808080'};
`;

const ResizeTooltip = styled.div`
    position: fixed;
    background: #ffffe1;
    border: 1px solid #000;
    padding: 2px 4px;
    font-size: 11px;
    z-index: 9999;
    pointer-events: none;
`;

const DisassemblyPane = ({ onContextMenu }) => {
  const dispatch = useDispatch();
  const instructions = useSelector(state => state.debug.disassembly);
  const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
  const lastSelected = useSelector(state => state.debug.lastSelectedAddress);
  const userComments = useSelector(state => state.debug.userComments);
  const settings = useSelector(state => state.debug.settings);
  const registers = useSelector(state => state.debug.registers);
  const modifiedAddresses = useSelector(state => state.debug.modifiedAddresses);
  
  // Find EIP
  const ripReg = registers.find(r => r.number === '16' || r.number === 'rip' || r.number === 'eip'); // 16 for x64 usually
  const currentIP = ripReg ? ripReg.value : null;

  const [colWidths, setColWidths] = useState([140, 160, 680, 180]); 
  const headers = ['Address', 'Hex dump', 'Disassembly', 'Comment'];
  
  const resizingRef = useRef(null);
  const [resizeTooltip, setResizeTooltip] = useState(null);

  const startResize = (index, e) => {
    e.preventDefault();
    resizingRef.current = { index, startX: e.clientX, startWidth: colWidths[index] };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(30, startWidth + delta);
    setColWidths(prev => {
      const next = [...prev];
      next[index] = newWidth;
      return next;
    });
    setResizeTooltip({ x: e.clientX + 10, y: e.clientY + 10, width: newWidth });
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    setResizeTooltip(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleRowClick = (e, addr, index) => {
    if (e.ctrlKey) {
        dispatch(toggleAddressSelection(addr));
    } else if (e.shiftKey && lastSelected) {
        const lastIdx = instructions.findIndex(i => i.address === lastSelected);
        if (lastIdx !== -1) {
            const start = Math.min(lastIdx, index);
            const end = Math.max(lastIdx, index);
            const range = instructions.slice(start, end + 1).map(i => i.address);
            dispatch(selectAddressRange(range));
        } else {
            dispatch(selectAddress(addr));
        }
    } else {
        dispatch(selectAddress(addr));
    }
  };

  const handleRightClick = (e, inst) => {
    e.preventDefault();
    if (!selectedAddresses.includes(inst.address)) {
        dispatch(selectAddress(inst.address));
    }
    if (onContextMenu) onContextMenu(e, inst);
  };

  const handleDoubleClick = (inst) => {
      // Logic to follow call/jmp
      const parts = inst.inst.split(' ');
      for (let part of parts) {
          if (part.startsWith('0x')) {
              const target = part.replace(/[,]/g, '');
              dispatch(pushHistory(instructions[0].address)); // Save current view start
              dispatch(setViewStartAddress(target));
              return;
          }
      }
  };

  const formatTextCase = (text) => {
      return settings.listingCase === 'upper' ? text.toUpperCase() : text.toLowerCase();
  };

  const highlightRegisters = (text) => {
      const regRegex = /\b(eax|ebx|ecx|edx|esi|edi|esp|ebp|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r8|r9|r10|r11|r12|r13|r14|r15|rip|eip|al|ah|bl|bh|cl|ch|dl|dh)\b/gi;
      const parts = text.split(regRegex);
      return parts.map((part, i) => {
          if (part.match(regRegex)) {
              return <b key={i}>{part}</b>;
          }
          return part;
      });
  };

  const parseInstruction = (instData) => {
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

    mnemonic = formatTextCase(mnemonic);
    operands = formatTextCase(operands);
    
    // Register Naming
    if (settings.registerNaming === 'percent') {
        operands = operands.replace(/\b(rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r[0-9]+|eip|rip)\b/gi, '%$1');
        operands = operands.replace(/%%/g, '%');
    }

    // Swap Arguments (if 2 args exist)
    if (settings.swapArguments && operands.includes(',')) {
        // Simple splitting by first comma (basic heuristic)
        // Note: this assumes operands structure like "op1, op2"
        const parts = operands.split(',');
        if (parts.length >= 2) {
             // Reconstruct: op2, op1
             const op1 = parts[0].trim();
             const rest = parts.slice(1).join(',').trim(); // op2
             operands = `${rest},${op1}`;
        }
    }

    return { mnemonic, operands, gdbComment };
  };

  return (
    <PaneContainer>
      <HeaderRow>
        {headers.map((title, idx) => (
          <HeaderCell key={idx} style={{ width: colWidths[idx] }}>
            {title}
            <ResizerHandle onMouseDown={(e) => startResize(idx, e)} />
          </HeaderCell>
        ))}
      </HeaderRow>
      
      <ContentArea>
        {instructions.map((inst, idx) => {
          const isCurrentIP = BigInt(inst.address) === (currentIP ? BigInt(currentIP) : BigInt(-1));
          const isSelected = selectedAddresses.includes(inst.address);
          const isModified = modifiedAddresses.includes(inst.address);
          
          const { mnemonic, operands, gdbComment } = parseInstruction(inst);
          const isCall = mnemonic.toLowerCase().startsWith('call');
          
          let displayComment = userComments[inst.address];
          if (!displayComment && settings.showGdbComments && gdbComment) {
             displayComment = gdbComment;
          }

          const hexDump = inst.opcodes || "??";

          return (
            <Row 
              key={inst.address} 
              $current={isCurrentIP} 
              $selected={isSelected}
              $modified={isModified}
              onClick={(e) => handleRowClick(e, inst.address, idx)}
              onContextMenu={(e) => handleRightClick(e, inst)}
              onDoubleClick={() => handleDoubleClick(inst)}
            >
               <Cell style={{ width: colWidths[0] }}>{inst.address}</Cell>
               <Cell style={{ width: colWidths[1] }}>
                   <HexDump $selected={isSelected} $modified={isModified}>{hexDump}</HexDump>
               </Cell> 
               <Cell style={{ width: colWidths[2] }}>
                 <Mnemonic $isCall={isCall} $selected={isSelected} $modified={isModified}>{mnemonic}</Mnemonic>
                 &nbsp;
                 <Operands $selected={isSelected} $modified={isModified}>{highlightRegisters(operands)}</Operands>
               </Cell>
               <Cell style={{ width: colWidths[3] }}>
                 <CommentText $selected={isSelected} $modified={isModified}>{displayComment}</CommentText>
               </Cell>
            </Row>
          );
        })}
      </ContentArea>

      {resizeTooltip && (
          <ResizeTooltip style={{top: resizeTooltip.y, left: resizeTooltip.x}}>
              Width: {resizeTooltip.width}px
          </ResizeTooltip>
      )}
    </PaneContainer>
  );
};

export default DisassemblyPane;