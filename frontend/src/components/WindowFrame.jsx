
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { focusWindow, closeWindow, moveWindow, resizeWindow, toggleMaximize } from '../store/windowsSlice';

const Frame = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #d4d0c8;
  border: 2px outset #fff;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
  user-select: none;
`;

const TitleBar = styled.div`
  height: 18px;
  background: ${props => props.$active ? 'linear-gradient(90deg, #000080, #1084d0)' : '#808080'};
  color: ${props => props.$active ? '#fff' : '#d4d0c8'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  font-weight: bold;
`;

const Controls = styled.div`
  display: flex;
  gap: 2px;
`;

const ControlBtn = styled.button`
  width: 14px;
  height: 14px;
  background: #d4d0c8;
  border: 1px outset #fff;
  padding: 0;
  line-height: 10px;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    border: 1px inset #fff;
  }
`;

const Content = styled.div`
  flex: 1;
  background: #fff;
  border: 2px inset #fff;
  margin: 2px;
  overflow: hidden;
  position: relative;
`;

const ResizeHandle = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;
  bottom: 0;
  right: 0;
  cursor: se-resize;
  z-index: 100;
  /* Minimal grip visual */
  background: linear-gradient(135deg, transparent 50%, #808080 50%);
`;

const WindowFrame = ({ windowState, isActive, children }) => {
    const dispatch = useDispatch();
    const { id, title, x, y, w, h, z, maximized } = windowState;

    // Dragging Logic
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Resizing Logic
    const [isResizing, setIsResizing] = useState(false);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        dispatch(focusWindow(id));
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - x,
            y: e.clientY - y
        };
        e.preventDefault();
    };

    const handleResizeMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation(); // Don't trigger drag
        setIsResizing(true);
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: w,
            h: h
        };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (maximized) return;

            if (isDragging) {
                const newX = e.clientX - dragOffset.current.x;
                const newY = e.clientY - dragOffset.current.y;
                dispatch(moveWindow({ id, x: newX, y: newY }));
            }

            if (isResizing) {
                const deltaX = e.clientX - resizeStart.current.x;
                const deltaY = e.clientY - resizeStart.current.y;
                const newW = Math.max(200, resizeStart.current.w + deltaX);
                const newH = Math.max(100, resizeStart.current.h + deltaY);
                dispatch(resizeWindow({ id, w: newW, h: newH }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, maximized, id, dispatch]);


    // Maximize Logic
    const style = maximized ? {
        top: 0, left: 0, width: '100%', height: '100%', zIndex: z
    } : {
        top: y, left: x, width: w, height: h, zIndex: z
    };

    return (
        <Frame style={style} onMouseDown={() => dispatch(focusWindow(id))}>
            {!maximized && (
                <TitleBar $active={isActive} onMouseDown={handleMouseDown} onDoubleClick={() => dispatch(toggleMaximize(id))}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{title}</span>
                    </div>
                    <Controls>
                        <ControlBtn onClick={() => {/* Minimize logic pending */ }}>_</ControlBtn>
                        <ControlBtn onClick={() => dispatch(toggleMaximize(id))}>□</ControlBtn>
                        <ControlBtn onClick={(e) => { e.stopPropagation(); dispatch(closeWindow(id)); }}>x</ControlBtn>
                    </Controls>
                </TitleBar>
            )}
            <Content>
                {children}
            </Content>
            {!maximized && <ResizeHandle onMouseDown={handleResizeMouseDown} />}
        </Frame>
    );
};

export default WindowFrame;
