import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const Bar = styled.div`
  height: 20px;
  background: #d4d0c8;
  display: flex;
  align-items: center;
  padding: 0 5px;
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
  z-index: 100;
`;

const MenuList = styled.div`
  display: ${props => props.$isOpen ? 'block' : 'none'};
  position: absolute;
  top: 100%;
  left: 0;
  background: #d4d0c8;
  border: 1px outset #fff;
  min-width: 150px;
  padding: 2px;
  z-index: 101;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
`;

const MenuItemRoot = styled.div`
  padding: 2px 8px;
  cursor: pointer;
  position: relative;
  background-color: ${props => props.$isOpen ? '#000080' : 'transparent'};
  color: ${props => props.$isOpen ? 'white' : 'black'};
  
  &:hover {
    background-color: #000080;
    color: white;
  }
`;

const DropdownItem = styled.div`
  padding: 4px 10px;
  cursor: pointer;
  color: #000;
  position: relative;
  display: flex;
  justify-content: space-between;

  &:hover {
    background-color: #000080;
    color: white;
  }
`;

const SubMenu = styled(MenuList)`
  top: -2px;
  left: 100%;
  /* Submenus still work on hover for now, or could act same as clicks */
  display: none;
`;

const DropdownItemWithSub = styled(DropdownItem)`
  &:hover > ${SubMenu} {
    display: block;
  }
`;

const Arrow = styled.span`
  margin-left: 10px;
  font-size: 9px;
`;

const MainMenu = ({ handleSessionLoad, setActiveModal, toggleLogs, focusDisassembly, version }) => {
  const [openMenu, setOpenMenu] = useState(null); // 'file', 'view', 'window', etc.
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // If a menu is already open, hovering another root item switches to it
  const handleMouseEnter = (menu) => {
    if (openMenu) {
      setOpenMenu(menu);
    }
  };

  const onItemClick = (action) => {
    action();
    setOpenMenu(null);
  };

  return (
    <Bar ref={menuRef}>
      <MenuItemRoot
        $isOpen={openMenu === 'file'}
        onClick={() => toggle('file')}
        onMouseEnter={() => handleMouseEnter('file')}
      >
        File
        <MenuList $isOpen={openMenu === 'file'}>
          <DropdownItem onClick={() => onItemClick(() => setActiveModal('file_browser'))}>Open...</DropdownItem>
          <DropdownItem onClick={() => onItemClick(handleSessionLoad)}>Reload Binary</DropdownItem>
          <DropdownItemWithSub>
            Database <Arrow>▶</Arrow>
            <SubMenu>
              <DropdownItem onClick={() => onItemClick(() => setActiveModal('confirm_reset'))}>Remove DB</DropdownItem>
            </SubMenu>
          </DropdownItemWithSub>
          {/* Exit removed as per request */}
        </MenuList>
      </MenuItemRoot>

      <MenuItemRoot
        $isOpen={openMenu === 'view'}
        onClick={() => toggle('view')}
        onMouseEnter={() => handleMouseEnter('view')}
      >
        View
        <MenuList $isOpen={openMenu === 'view'}>
          <DropdownItem onClick={() => onItemClick(() => { })}>CPU</DropdownItem>
          <DropdownItem onClick={() => onItemClick(() => { })}>Log</DropdownItem>
          <DropdownItem onClick={() => onItemClick(() => { })}>Breakpoints</DropdownItem>
          <DropdownItem onClick={() => onItemClick(() => { })}>Memory</DropdownItem>
        </MenuList>
      </MenuItemRoot>

      <MenuItemRoot>Debug</MenuItemRoot>
      <MenuItemRoot>Plugins</MenuItemRoot>
      <MenuItemRoot onClick={() => setActiveModal('options')}>Options</MenuItemRoot>

      <MenuItemRoot
        $isOpen={openMenu === 'window'}
        onClick={() => toggle('window')}
        onMouseEnter={() => handleMouseEnter('window')}
      >
        Window
        <MenuList $isOpen={openMenu === 'window'}>
          <DropdownItem onClick={() => onItemClick(toggleLogs)}>System Log</DropdownItem>
          <DropdownItem onClick={() => onItemClick(focusDisassembly)}>Disassembly</DropdownItem>
        </MenuList>
      </MenuItemRoot>

      <MenuItemRoot>Help</MenuItemRoot>

      <div style={{ marginLeft: 'auto', padding: '0 10px', color: '#666', fontSize: '11px' }}>
        v{version || '...'}
      </div>
    </Bar>
  );
};

export default MainMenu;
