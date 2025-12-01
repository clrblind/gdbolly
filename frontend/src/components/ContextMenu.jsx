import React, { useEffect, useRef, useState } from 'react';
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

const MenuItemStyled = styled.div`
  padding: 4px 10px;
  cursor: pointer;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
  display: flex;
  justify-content: space-between;
  position: relative;

  &:hover {
    background-color: #000080;
    color: white;
  }
  
  border-bottom: ${props => props.$separator ? '1px solid #808080' : 'none'};
  margin-bottom: ${props => props.$separator ? '2px' : '0'};
  padding-bottom: ${props => props.$separator ? '2px' : '4px'};
`;

const ArrowRight = styled.span`
  margin-left: 10px;
  font-size: 9px;
`;

const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Logic complicated by submenus. Simplified: check if target is inside menuRef
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!items || items.length === 0) return null;

  // Ensure menu stays on screen (simple check)
  const style = {
    left: Math.min(x, window.innerWidth - 160),
    top: Math.min(y, window.innerHeight - (items.length * 25)),
  };

  return (
    <MenuContainer ref={menuRef} style={style}>
      {items.map((item, index) => (
         <MenuItemWithSub key={index} item={item} onClose={onClose} />
      ))}
    </MenuContainer>
  );
};

const MenuItemWithSub = ({ item, onClose }) => {
    const [showSub, setShowSub] = useState(false);

    const handleClick = (e) => {
        if (item.action) {
            item.action();
            onClose();
        }
    };

    return (
        <MenuItemStyled 
            $separator={item.separator}
            onClick={handleClick}
            onMouseEnter={() => setShowSub(true)}
            onMouseLeave={() => setShowSub(false)}
        >
            <span>{item.label}</span>
            {item.hotkey && <span>{item.hotkey}</span>}
            {item.submenu && <ArrowRight>▶</ArrowRight>}

            {item.submenu && showSub && (
                <MenuContainer style={{ left: '100%', top: -2 }}>
                    {item.submenu.map((subItem, idx) => (
                        <MenuItemWithSub key={idx} item={subItem} onClose={onClose} />
                    ))}
                </MenuContainer>
            )}
        </MenuItemStyled>
    );
};

export default ContextMenu;