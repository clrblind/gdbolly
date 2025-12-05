import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';

const WinContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #fff;
  border: 2px inset #fff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const TableContainer = styled.div`
  flex: 1;
  overflow: auto; /* Both vertical and horizontal */
  font-family: 'Consolas', monospace;
  font-size: 12px;
  background: #fff;
  position: relative;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #d4d0c8;
  border-right: 1px solid #808080;
  border-bottom: 1px solid #808080;
  text-align: left;
  padding: 2px 4px;
  font-weight: normal;
  position: sticky;
  top: 0;
  z-index: 1; /* Keep header on top */
`;

const StyledRow = styled.tr`
  background: ${props => props.$selected ? '#000080' : 'transparent'};
  color: ${props => props.$selected ? '#fff' : '#000'};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$selected ? '#000080' : '#e0e0e0'};
  }
  outline: ${props => props.$hovered ? '1px dotted black' : 'none'};
`;

const Td = styled.td`
  padding: 1px 4px;
  white-space: pre; /* Keep whitespace */
  border-right: 1px solid #eee;
  border-bottom: 1px solid transparent; 
  vertical-align: top;
`;

const LogRow = ({ log, index, isSelected, onClick }) => {
  const [hovered, setHovered] = useState(false);

  // Attempt to parse address if message starts with placeholder logic
  let address = "";
  let message = log.message;

  return (
    <StyledRow
      $selected={isSelected}
      $hovered={hovered && !isSelected}
      onClick={(e) => onClick(e, index, log.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Td style={{ borderRight: '1px solid #ccc', minWidth: '60px' }}>{address}</Td>
      <Td style={{ minWidth: '100%', display: 'inline-block' }}>{message}</Td>
    </StyledRow>
  );
};

const DebugLogWindow = ({ onClose }) => {
  const logs = useSelector(state => state.debug.debugLogs);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const lastSelectedIndex = useRef(null);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (selectedIndices.size === 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length]);

  const handleRowClick = (e, index, id) => {
    const newSelection = new Set(selectedIndices);

    if (e.ctrlKey) {
      if (newSelection.has(index)) newSelection.delete(index);
      else newSelection.add(index);
      lastSelectedIndex.current = index;
    } else if (e.shiftKey && lastSelectedIndex.current !== null) {
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      newSelection.clear();
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
    } else {
      newSelection.clear();
      newSelection.add(index);
      lastSelectedIndex.current = index;
    }
    setSelectedIndices(newSelection);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) onClose();
    }

    // Select All
    if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const all = new Set();
      logs.forEach((_, i) => all.add(i));
      setSelectedIndices(all);
    }

    // Copy
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const selectedLogs = logs.filter((_, i) => selectedIndices.has(i));
      const text = selectedLogs.map(l => l.message).join('\n');
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <WinContainer tabIndex="0" onKeyDown={handleKeyDown}>
      <TableContainer ref={containerRef}>
        <Table>
          <thead style={{ height: '20px' }}>
            <tr>
              <Th style={{ width: '80px' }}>Address</Th>
              <Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <LogRow
                key={log.id}
                log={log}
                index={index}
                isSelected={selectedIndices.has(index)}
                onClick={handleRowClick}
              />
            ))}
            <tr ref={bottomRef}></tr>
          </tbody>
        </Table>
      </TableContainer>
    </WinContainer>
  );
};

export default DebugLogWindow;
