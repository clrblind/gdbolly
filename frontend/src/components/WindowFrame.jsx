
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

// Resize handles for all edges
const ResizeHandle = styled.div`
  position: absolute;
  ${props => props.$type === 'corner' ? `
    width: 10px;
    height: 10px;
    bottom: 0;
    right: 0;
    cursor: se-resize;
    background: linear-gradient(135deg, transparent 50%, #808080 50%);
  ` : props.$type === 'right' ? `
    width: 4px;
    height: 100%;
    right: 0;
    top: 0;
    cursor: e-resize;
  ` : props.$type === 'bottom' ? `
    width: 100%;
    height: 4px;
    bottom: 0;
    left: 0;
    cursor: s-resize;
  ` : props.$type === 'left' ? `
    width: 4px;
    height: 100%;
    left: 0;
    top: 0;
    cursor: w-resize;
  ` : props.$type === 'top' ? `
    width: 100%;
    height: 4px;
    top: 0;
    left: 0;
    cursor: n-resize;
  ` : ''}
  z-index: 100;
`;

const WindowFrame = ({ windowState, isActive, children }) => {
    const dispatch = useDispatch();
    const { id, title, x, y, w, h, z, maximized } = windowState;

    // Dragging Logic
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Resizing Logic
    const [resizeState, setResizeState] = useState(null);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, startX: 0, startY: 0 });

    // Viewport bounds (toolbar ~30px, statusbar ~22px)
    const TOOLBAR_HEIGHT = 48;
    const STATUSBAR_HEIGHT = 22;
    const MIN_WINDOW_SIZE = { w: 200, h: 100 };

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

    const handleResizeMouseDown = (type) => (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setResizeState(type);
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: w,
            h: h,
            startX: x,
            startY: y
        };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (maximized) return;

            if (isDragging) {
                let newX = e.clientX - dragOffset.current.x;
                let newY = e.clientY - dragOffset.current.y;

                // Constrain movement within viewport
                const maxX = window.innerWidth - w;
                const maxY = window.innerHeight - STATUSBAR_HEIGHT - h;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(TOOLBAR_HEIGHT, Math.min(newY, maxY));

                dispatch(moveWindow({ id, x: newX, y: newY }));
            }

            if (resizeState) {
                const deltaX = e.clientX - resizeStart.current.x;
                const deltaY = e.clientY - resizeStart.current.y;
                let newW = w;
                let newH = h;
                let newX = x;
                let newY = y;

                switch (resizeState) {
                    case 'right':
                        newW = Math.max(MIN_WINDOW_SIZE.w, resizeStart.current.w + deltaX);
                        break;
                    case 'bottom':
                        newH = Math.max(MIN_WINDOW_SIZE.h, resizeStart.current.h + deltaY);
                        break;
                    case 'left':
                        newW = Math.max(MIN_WINDOW_SIZE.w, resizeStart.current.w - deltaX);
                        if (newW > MIN_WINDOW_SIZE.w) {
                            newX = resizeStart.current.startX + deltaX;
                        }
                        break;
                    case 'top':
                        newH = Math.max(MIN_WINDOW_SIZE.h, resizeStart.current.h - deltaY);
                        if (newH > MIN_WINDOW_SIZE.h) {
                            newY = resizeStart.current.startY + deltaY;
                        }
                        break;
                    case 'corner':
                        newW = Math.max(MIN_WINDOW_SIZE.w, resizeStart.current.w + deltaX);
                        newH = Math.max(MIN_WINDOW_SIZE.h, resizeStart.current.h + deltaY);
                        break;
                }

                if (newX !== x || newY !== y) {
                    dispatch(moveWindow({ id, x: newX, y: newY }));
                }
                if (newW !== w || newH !== h) {
                    dispatch(resizeWindow({ id, w: newW, h: newH }));
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setResizeState(null);
        };

        if (isDragging || resizeState) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeState, maximized, id, x, y, w, h, dispatch]);


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
            {!maximized && (
                <>
                    <ResizeHandle $type="right" onMouseDown={handleResizeMouseDown('right')} />
                    <ResizeHandle $type="bottom" onMouseDown={handleResizeMouseDown('bottom')} />
                    <ResizeHandle $type="left" onMouseDown={handleResizeMouseDown('left')} />
                    <ResizeHandle $type="top" onMouseDown={handleResizeMouseDown('top')} />
                    <ResizeHandle $type="corner" onMouseDown={handleResizeMouseDown('corner')} />
                </>
            )}
        </Frame>
    );
};

export default WindowFrame;
