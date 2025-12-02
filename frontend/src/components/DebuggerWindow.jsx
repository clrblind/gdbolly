
import React from 'react';
import styled from 'styled-components';

const WinContainer = styled.div`
  position: absolute;
  top: 30px; /* Below Toolbar */
  left: 0;
  right: 0;
  bottom: 20px; /* Above status bar */
  background: #fff;
  z-index: 50;
  display: flex;
  flex-direction: column;
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

const Content = styled.div`
  flex: 1;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  padding: 5px;
  white-space: pre; /* No word wrap */
`;

const DebuggerWindow = ({ title, children, onClose }) => {
  return (
    <WinContainer>
        <WinHeader>
            <span>{title}</span>
            <CloseBtn onClick={onClose}>x</CloseBtn>
        </WinHeader>
        <Content>
            {children}
        </Content>
    </WinContainer>
  );
};

export default DebuggerWindow;
