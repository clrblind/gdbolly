import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const MenuContainer = styled.div`
  position: absolute;
  background-color: #d4d0c8;
  border: 1px outset #fff;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
  z-index: 9999;
  min-width: 150px;
  padding: 2px;
`;

const MenuItem = styled.div`
  padding: 4px 10px;
  cursor: pointer;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
  display: flex;
  justify-content: space-between;

  &:hover {
    background-color: #000080;
    color: white;
  }
  
  border-bottom: ${props => props.$separator ? '1px solid #808080' : 'none'};
  margin-bottom: ${props => props.$separator ? '2px' : '0'};
  padding-bottom: ${props => props.$separator ? '2px' : '4px'};
`;

const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!items || items.length === 0) return null;

  // Prevent menu from going off-screen
  const style = {
    left: x,
    top: y,
  };

  return (
    <MenuContainer ref={menuRef} style={style}>
      {items.map((item, index) => (
        <MenuItem 
            key={index} 
            onClick={() => { item.action(); onClose(); }}
            $separator={item.separator}
        >
          <span>{item.label}</span>
          {item.hotkey && <span>{item.hotkey}</span>}
        </MenuItem>
      ))}
    </MenuContainer>
  );
};

export default ContextMenu;