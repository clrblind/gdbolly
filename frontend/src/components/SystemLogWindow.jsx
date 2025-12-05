
import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';

const WinContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #fff;
  border: 2px inset #fff; /* Looks like a pane now */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const WinHeader = styled.div`
  height: 20px;
  background: linear-gradient(90deg, #000080, #1084d0);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5px;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  font-weight: bold;
  cursor: default;
  flex-shrink: 0;
`;

const CloseBtn = styled.button`
  width: 16px;
  height: 16px;
  background: #d4d0c8;
  border: 1px outset #fff;
  cursor: pointer;
  padding: 0;
  line-height: 14px;
`;

const TableContainer = styled.div`
  flex: 1;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  background: #fff;
  position: relative;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
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
`;

const StyledRow = styled.tr`
  background: ${props => props.$selected ? '#000080' : 'transparent'};
  color: ${props => {
    if (props.$selected) return '#fff';
    if (props.type === 'error') return 'red';
    if (props.type === 'warning') return '#808000'; // Olive for warnings
    return '#000';
  }};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$selected ? '#000080' : '#e0e0e0'};
  }
  /* Use outline instead of border to prevent jitter */
  outline: ${props => props.$hovered ? '1px dotted black' : 'none'};
`;

const Td = styled.td`
  padding: 1px 4px;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid #eee;
  border-bottom: 1px solid transparent; 
`;

const LogRow = ({ log, isSelected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <StyledRow
      $selected={isSelected}
      $hovered={hovered && !isSelected}
      type={log.type}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Td style={{ borderRight: '1px solid #ccc' }}>{log.timestamp}</Td>
      <Td title={log.message} style={{ color: 'inherit' }}>{log.message}</Td>
    </StyledRow>
  );
};

const SystemLogWindow = ({ onClose }) => {
  const logs = useSelector(state => state.debug.systemLogs);
  const [selectedId, setSelectedId] = useState(null);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Auto scroll if nothing selected or at bottom
    if (!selectedId && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, selectedId]);

  const handleKeyDown = (e) => {
    // Close on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) onClose();
      return;
    }

    if (logs.length === 0) return;
    const idx = logs.findIndex(l => l.id === selectedId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (idx === -1 || idx === logs.length - 1) ? logs.length - 1 : idx + 1;
      setSelectedId(logs[nextIdx].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (idx === -1 || idx === 0) ? 0 : idx - 1;
      setSelectedId(logs[prevIdx].id);
    }
  };

  return (
    <WinContainer tabIndex="0" onKeyDown={handleKeyDown}>
      <WinHeader>
        <span>System Log</span>
        <CloseBtn onClick={onClose}>x</CloseBtn>
      </WinHeader>
      <TableContainer ref={containerRef}>
        <Table>
          <thead style={{ height: '20px' }}>
            <tr>
              <Th style={{ width: '120px' }}>Timestamp</Th>
              <Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                isSelected={selectedId === log.id}
                onClick={() => setSelectedId(log.id)}
              />
            ))}
            <tr ref={bottomRef}></tr>
          </tbody>
        </Table>
      </TableContainer>
    </WinContainer>
  );
};

export default SystemLogWindow;
