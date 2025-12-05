
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
  overflow: auto; /* Both vertical and horizontal */
  font-family: 'Consolas', monospace;
  font-size: 12px;
  background: #fff;
  position: relative;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  /* table-layout: fixed; Removed to allow horizontal expansion for long logs */
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

const LogRow = ({ log, isSelected, onClick }) => {
    const [hovered, setHovered] = useState(false);

    // Attempt to parse address if message starts with address-like string
    // For now just basic placeholder logic logic or regex
    // E.g. "00401000: Message"
    let address = "";
    let message = log.message;

    // Simple heuristic: if message starts with hex, split it
    // This depends on how backend sends it. For now assume raw message.

    return (
        <StyledRow
            $selected={isSelected}
            $hovered={hovered && !isSelected}
            onClick={onClick}
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
    const [selectedId, setSelectedId] = useState(null);
    const containerRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!selectedId && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, selectedId]);

    return (
        <WinContainer>
            <WinHeader>
                <span>Debug Log (Target Output)</span>
                <CloseBtn onClick={onClose}>x</CloseBtn>
            </WinHeader>
            <TableContainer ref={containerRef}>
                <Table>
                    <thead style={{ height: '20px' }}>
                        <tr>
                            <Th style={{ width: '80px' }}>Address</Th>
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

export default DebugLogWindow;
