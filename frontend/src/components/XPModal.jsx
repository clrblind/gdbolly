import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.1); /* Minimal dimming */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const Window = styled.div`
  background-color: #d4d0c8;
  border: 1px outset #fff;
  box-shadow: 4px 4px 10px rgba(0,0,0,0.5);
  min-width: 300px;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TitleBar = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: white;
  padding: 3px 5px;
  font-family: 'Tahoma', sans-serif;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  cursor: default;
`;

const CloseButton = styled.button`
  background: #d4d0c8;
  border: 1px outset #fff;
  width: 16px;
  height: 16px;
  line-height: 12px;
  text-align: center;
  padding: 0;
  font-weight: bold;
  cursor: pointer;
  
  &:active { border: 1px inset #fff; }
`;

const Content = styled.div`
  padding: 15px;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  gap: 10px;
`;

const XPButton = styled.button`
  min-width: 75px;
  padding: 4px;
  background: #d4d0c8;
  border: 1px outset #fff;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  cursor: pointer;
  &:active { border: 1px inset #fff; }
`;

const XPModal = ({ title, children, onClose, onOk }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && onOk && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
          // Careful with Enter on Inputs, sometimes it should submit, sometimes not.
          onOk();
      }
      if (e.key === 'Enter' && onOk && e.target.tagName === 'INPUT') {
          onOk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onOk]);

  const handleMouseDown = (e) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <Overlay>
      <Window style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <TitleBar onMouseDown={handleMouseDown}>
          <span>{title}</span>
          <CloseButton onClick={(e) => { e.stopPropagation(); onClose(); }}>x</CloseButton>
        </TitleBar>
        <Content>
          {children}
        </Content>
        <ButtonRow>
          {onOk && <XPButton onClick={onOk}>OK</XPButton>}
          <XPButton onClick={onClose}>Cancel</XPButton>
        </ButtonRow>
      </Window>
    </Overlay>
  );
};

export default XPModal;
