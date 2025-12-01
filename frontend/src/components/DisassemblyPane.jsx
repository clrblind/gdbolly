import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedAddress } from '../store/debuggerSlice';

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
  
  /* Current IP (Black text on Grey) - High priority visual */
  background-color: ${props => props.$current ? '#c0c0c0' : props.$selected ? '#000080' : 'transparent'};
  color: ${props => props.$current ? '#000000' : props.$selected ? '#ffffff' : 'inherit'};

  &:hover {
    border: ${props => (!props.$selected && !props.$current) ? '1px solid #000' : 'none'};
    margin: ${props => (!props.$selected && !props.$current) ? '-1px' : '0'};
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

// Specific styling for mnemonics
const Mnemonic = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$isCall ? '#0000ff' : '#000'};
  font-weight: ${props => props.$isCall ? 'bold' : 'normal'};
`;

const Operands = styled.span`
  color: ${props => props.$selected ? '#fff' : '#000'};
`;

const CommentText = styled.span`
  color: ${props => props.$selected ? '#fff' : '#808080'};
`;

// Tooltip for resizing
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
  const selectedAddr = useSelector(state => state.debug.selectedAddress);
  const userComments = useSelector(state => state.debug.userComments);
  const settings = useSelector(state => state.debug.settings);
  
  // Column widths state
  const [colWidths, setColWidths] = useState([80, 100, 200, 250]); // Address, Hex, Opcode, Comment
  const headers = ['Address', 'Hex dump', 'Disassembly', 'Comment'];
  
  // Resizing state
  const resizingRef = useRef(null);
  const [resizeTooltip, setResizeTooltip] = useState(null); // {x, y, width}

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

    setResizeTooltip({
        x: e.clientX + 10,
        y: e.clientY + 10,
        width: newWidth
    });
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    setResizeTooltip(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleRowClick = (addr) => {
    dispatch(setSelectedAddress(addr));
  };

  const handleRightClick = (e, inst) => {
    e.preventDefault();
    dispatch(setSelectedAddress(inst.address));
    if (onContextMenu) {
        onContextMenu(e, inst);
    }
  };

  const parseInstruction = (instData) => {
    // instData has { address, inst, opcodes, ... }
    // inst string might look like "mov eax, 1 # comment"
    
    let rawInst = instData.inst || "";
    let mnemonic = "";
    let operands = "";
    let gdbComment = "";

    // 1. Separate GDB comment (starts with #)
    const commentSplit = rawInst.split('#');
    let codePart = commentSplit[0].trim();
    if (commentSplit.length > 1) {
        gdbComment = commentSplit.slice(1).join('#').trim();
    }

    // 2. Parse Mnemonic vs Operands
    const spaceIdx = codePart.indexOf(' ');
    if (spaceIdx === -1) {
        mnemonic = codePart;
    } else {
        mnemonic = codePart.substring(0, spaceIdx);
        operands = codePart.substring(spaceIdx); // Keep leading space for visuals
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
          const isCurrentIP = idx === 0; // Assuming first item is IP
          const isSelected = selectedAddr === inst.address;
          const { mnemonic, operands, gdbComment } = parseInstruction(inst);
          const isCall = mnemonic.toLowerCase().startsWith('call');
          
          // Comment Logic: User > GDB (if enabled)
          let displayComment = userComments[inst.address];
          if (!displayComment && settings.showGdbComments && gdbComment) {
             displayComment = gdbComment;
          }

          // Hex formatting
          const hexDump = inst.opcodes || "??";

          return (
            <Row 
              key={inst.address} 
              $current={isCurrentIP} 
              $selected={isSelected}
              onClick={() => handleRowClick(inst.address)}
              onContextMenu={(e) => handleRightClick(e, inst)}
            >
               <Cell style={{ width: colWidths[0] }}>{inst.address}</Cell>
               <Cell style={{ width: colWidths[1], color: isSelected ? '#fff' : '#808080' }}>{hexDump}</Cell> 
               <Cell style={{ width: colWidths[2] }}>
                 <Mnemonic $isCall={isCall} $selected={isSelected}>{mnemonic}</Mnemonic>
                 <Operands $selected={isSelected}>{operands}</Operands>
               </Cell>
               <Cell style={{ width: colWidths[3] }}>
                 <CommentText $selected={isSelected}>{displayComment}</CommentText>
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