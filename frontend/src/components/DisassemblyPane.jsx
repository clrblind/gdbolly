
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { 
    selectAddress, toggleAddressSelection, selectAddressRange, 
    pushHistory, setViewStartAddress 
} from '../store/debuggerSlice';
import { parseInstruction } from '../utils/asmFormatter';
import { offsetAddress, normalizeAddress } from '../utils/addressUtils';
import DisassemblyRow from './DisassemblyRow';

const PaneContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  cursor: default;
  outline: none; /* Focusable */
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
  const viewStartAddress = useSelector(state => state.debug.viewStartAddress);
  
  const ripReg = registers.find(r => r.number === '16' || r.number === 'rip' || r.number === 'eip'); 
  const currentIP = ripReg ? normalizeAddress(ripReg.value) : null;

  const [colWidths, setColWidths] = useState([140, 160, 680, 180]); 
  const headers = ['Address', 'Hex dump', 'Disassembly', 'Comment'];
  
  const resizingRef = useRef(null);
  const [resizeTooltip, setResizeTooltip] = useState(null);
  const containerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Drag selection state
  const isSelecting = useRef(false);
  const selectionStartIdx = useRef(null);

  const startResize = (index, e) => {
    e.preventDefault();
    resizingRef.current = { index, startX: e.clientX, startWidth: colWidths[index] };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  };

  const handleResizeMove = (e) => {
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

  const handleResizeUp = () => {
    resizingRef.current = null;
    setResizeTooltip(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeUp);
  };

  // Scroll Pre-fetching
  useEffect(() => {
    isFetchingRef.current = false;
  }, [instructions]);

  const handleScroll = (e) => {
      const el = e.target;
      if (isFetchingRef.current) return;
      if (instructions.length === 0) return;

      if (el.scrollTop < 10) {
          // Scrolled to top, try to fetch previous
          isFetchingRef.current = true;
          const prev = offsetAddress(instructions[0].address, -64); // ~16 instructions
          dispatch(setViewStartAddress(prev));
      } else if (el.scrollHeight - el.scrollTop - el.clientHeight < 10) {
          // Scrolled to bottom
          isFetchingRef.current = true;
          // Jump view start to the end to simulate paging down
          const next = instructions[Math.max(0, instructions.length - 5)].address;
          dispatch(setViewStartAddress(next));
      }
  };

  const handleKeyDown = (e) => {
      // Allow moving selection with arrows
      if (selectedAddresses.length === 0 && instructions.length > 0) return;
      
      const currentAddr = lastSelected || selectedAddresses[0];
      const idx = instructions.findIndex(i => i.address === currentAddr);
      
      if (idx === -1) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (idx < instructions.length - 1) {
              const next = instructions[idx + 1].address;
              dispatch(selectAddress(next));
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx > 0) {
              const prev = instructions[idx - 1].address;
              dispatch(selectAddress(prev));
          }
      }
  };

  const handleMouseDown = (addr, idx, e) => {
      if (e.button !== 0) return; 
      isSelecting.current = true;
      selectionStartIdx.current = idx;
      
      if (e.ctrlKey) {
        dispatch(toggleAddressSelection(addr));
      } else if (e.shiftKey && lastSelected) {
        handleShiftClick(idx);
      } else {
        dispatch(selectAddress(addr));
      }
  };

  const handleMouseEnter = (addr, idx) => {
      if (isSelecting.current) {
          const start = selectionStartIdx.current;
          const end = idx;
          const low = Math.min(start, end);
          const high = Math.max(start, end);
          
          const range = instructions.slice(low, high + 1).map(i => i.address);
          dispatch(selectAddressRange(range));
      }
  };

  const handleMouseUp = () => {
      isSelecting.current = false;
  };

  const handleShiftClick = (index) => {
      const lastIdx = instructions.findIndex(i => i.address === lastSelected);
      if (lastIdx !== -1) {
          const start = Math.min(lastIdx, index);
          const end = Math.max(lastIdx, index);
          const range = instructions.slice(start, end + 1).map(i => i.address);
          dispatch(selectAddressRange(range));
      }
  };

  const handleRightClick = (e, inst) => {
    e.preventDefault();
    if (!selectedAddresses.includes(inst.address)) {
        dispatch(selectAddress(inst.address));
    }
    if (onContextMenu) onContextMenu(e, inst);
  };

  const handleDoubleClick = (inst, parsed) => {
      const parts = parsed.operands.split(',');
      for (let part of parts) {
          const clean = part.trim();
          if (clean.match(/^0x[0-9a-fA-F]+$/)) {
              dispatch(pushHistory(instructions[0].address)); 
              dispatch(setViewStartAddress(clean));
              return;
          }
      }
  };

  return (
    <PaneContainer 
        tabIndex="0" 
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
    >
      <HeaderRow>
        {headers.map((title, idx) => (
          <HeaderCell key={idx} style={{ width: colWidths[idx] }}>
            {title}
            <ResizerHandle onMouseDown={(e) => startResize(idx, e)} />
          </HeaderCell>
        ))}
      </HeaderRow>
      
      <ContentArea ref={containerRef} onScroll={handleScroll}>
        {instructions.map((inst, idx) => {
          const normAddr = normalizeAddress(inst.address);
          const isCurrentIP = normAddr === currentIP;
          const isSelected = selectedAddresses.includes(normAddr);
          const isModified = modifiedAddresses.includes(normAddr);
          
          const parsed = parseInstruction(inst, settings);
          
          let displayComment = userComments[normAddr];
          if (!displayComment && settings.showGdbComments && parsed.gdbComment) {
             displayComment = parsed.gdbComment;
          }

          return (
            <DisassemblyRow 
                key={inst.address}
                inst={inst}
                parsed={parsed}
                colWidths={colWidths}
                isCurrent={isCurrentIP}
                isSelected={isSelected}
                isModified={isModified}
                comment={displayComment}
                onClick={(e) => {}} 
                onMouseDown={(e) => handleMouseDown(normAddr, idx, e)}
                onMouseEnter={() => handleMouseEnter(normAddr, idx)}
                onContextMenu={(e) => handleRightClick(e, inst)}
                onDoubleClick={() => handleDoubleClick(inst, parsed)}
                onMouseUp={handleMouseUp}
            />
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
