import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedAddress } from '../store/debuggerSlice';

const PaneContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
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
`;

const ResizerHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: white;
`;

const Row = styled.div`
  display: flex;
  white-space: pre;
  cursor: default;
  height: 16px;
  line-height: 16px;
  
  /* Selection (User Cursor) */
  background-color: ${props => props.$selected ? '#000080' : props.$current ? '#808080' : 'transparent'};
  color: ${props => props.$selected ? '#ffffff' : props.$current ? '#000000' : 'inherit'};

  &:hover {
    /* Optional hover effect if not selected */
    border: ${props => (!props.$selected && !props.$current) ? '1px solid #000' : 'none'};
    /* Adjust margin to prevent layout shift from border */
    margin: ${props => (!props.$selected && !props.$current) ? '-1px' : '0'};
    z-index: 1;
  }
`;

const Cell = styled.div`
  padding-left: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-right: 1px solid #eee;
  flex-shrink: 0;
`;

const OpcodeCell = styled(Cell)`
  font-weight: bold;
  color: ${props => props.$selected ? '#fff' : '#000'};
`;

const DisassemblyPane = () => {
  const dispatch = useDispatch();
  const instructions = useSelector(state => state.debug.disassembly);
  const selectedAddr = useSelector(state => state.debug.selectedAddress);
  
  // Column widths state
  const [colWidths, setColWidths] = useState([100, 120, 250, 200]); // Address, Bytes, Opcode, Comment
  const headers = ['Address', 'Hex dump', 'Disassembly', 'Comment'];
  
  // Resizing logic
  const resizingRef = useRef(null);

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
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleRowClick = (addr) => {
    dispatch(setSelectedAddress(addr));
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
          const isCurrentIP = idx === 0; // Assuming first item is always IP for now (simple logic)
          const isSelected = selectedAddr === inst.address;
          
          return (
            <Row 
              key={idx} 
              $current={isCurrentIP} 
              $selected={isSelected}
              onClick={() => handleRowClick(inst.address)}
            >
               <Cell style={{ width: colWidths[0], color: isSelected? '#fff' : '#000' }}>{inst.address}</Cell>
               <Cell style={{ width: colWidths[1], color: isSelected? '#fff' : '#808080' }}>?? ??</Cell> 
               <OpcodeCell style={{ width: colWidths[2] }} $selected={isSelected}>
                 {inst.inst}
               </OpcodeCell>
               <Cell style={{ width: colWidths[3], color: isSelected? '#fff' : '#808080' }}>
                 {/* Placeholder for comments */}
               </Cell>
            </Row>
          );
        })}
      </ContentArea>
    </PaneContainer>
  );
};

export default DisassemblyPane;