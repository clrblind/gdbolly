
import styled from 'styled-components';

export const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill #root */
  width: 100%;  /* Fill #root */
  background-color: #d4d0c8;
  overflow: hidden; 
`;

export const Workspace = styled.div`
  flex: 1; /* Grow to fill available space */
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* Clip content */
  min-height: 0; /* Critical for nested flex scrolling */
  padding: 2px;
`;

export const HorizontalSplit = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  overflow: hidden;
  min-height: 0;
`;

export const VerticalResizer = styled.div`
  width: 4px;
  background-color: #d4d0c8;
  border-left: 1px solid white;
  border-right: 1px solid #808080;
  cursor: col-resize;
  flex-shrink: 0;
  z-index: 10;
  &:hover { background-color: #e0e0e0; }
`;

export const HorizontalResizer = styled.div`
  height: 4px;
  background-color: #d4d0c8;
  border-top: 1px solid white;
  border-bottom: 1px solid #808080;
  cursor: row-resize;
  flex-shrink: 0;
  z-index: 10;
  width: 100%;
  &:hover { background-color: #e0e0e0; }
`;

export const Panel = styled.div`
  background: white;
  border: 2px inset #fff;
  overflow: hidden; 
  font-family: 'Consolas', monospace;
  font-size: 13px;
  position: relative;
  display: flex;
  flex-direction: column;
`;

export const Toolbar = styled.div`
  height: 30px;
  background: #d4d0c8;
  display: flex;
  align-items: center;
  padding: 0 5px;
  border-top: 1px solid white;
  border-bottom: 1px solid #808080;
  flex-shrink: 0;
  gap: 5px;
  
  button {
    padding: 2px 8px;
    font-size: 12px;
    background: #d4d0c8;
    border: 1px outset white;
    &:active { border: 1px inset white; }
    cursor: pointer;
  }
`;

export const MenuBar = styled.div`
  height: 20px;
  background: #d4d0c8;
  display: flex;
  align-items: center;
  padding: 0 5px;
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
`;

export const MenuItem = styled.div`
  padding: 2px 8px;
  cursor: pointer;
  &:hover {
    background-color: #000080;
    color: white;
  }
`;

export const StatusBar = styled.div`
  height: 20px;
  background: #d4d0c8;
  border-top: 1px solid #808080;
  display: flex;
  align-items: center;
  padding: 0 5px;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  flex-shrink: 0;
  
  & > div {
    border: 1px inset #fff;
    padding: 0 4px;
    height: 16px;
    display: flex;
    align-items: center;
    margin-right: 2px;
  }
`;
