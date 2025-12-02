
import React from 'react';
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
  display: none;
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
  
  &:hover {
    background-color: #000080;
    color: white;
  }
  
  &:hover > ${MenuList} {
    display: block;
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

const MainMenu = ({ handleSessionLoad, setActiveModal, toggleLogs, focusDisassembly }) => {
  return (
    <Bar>
        <MenuItemRoot>
            File
            <MenuList>
                <DropdownItem onClick={handleSessionLoad}>Reload Binary</DropdownItem>
                <DropdownItemWithSub>
                    Database <Arrow>▶</Arrow>
                    <SubMenu>
                        <DropdownItem onClick={() => setActiveModal('confirm_reset')}>Remove DB</DropdownItem>
                    </SubMenu>
                </DropdownItemWithSub>
                <DropdownItem>Exit</DropdownItem>
            </MenuList>
        </MenuItemRoot>

        <MenuItemRoot>
            View
            <MenuList>
                <DropdownItem>CPU</DropdownItem>
                <DropdownItem>Log</DropdownItem>
                <DropdownItem>Breakpoints</DropdownItem>
                <DropdownItem>Memory</DropdownItem>
            </MenuList>
        </MenuItemRoot>

        <MenuItemRoot>Debug</MenuItemRoot>
        <MenuItemRoot>Plugins</MenuItemRoot>
        <MenuItemRoot onClick={() => setActiveModal('options')}>Options</MenuItemRoot>
        <MenuItemRoot>
            Window
            <MenuList>
                <DropdownItem onClick={focusDisassembly}>Disassembly</DropdownItem>
                <DropdownItem onClick={toggleLogs}>System Log</DropdownItem>
            </MenuList>
        </MenuItemRoot>
        <MenuItemRoot>Help</MenuItemRoot>
    </Bar>
  );
};

export default MainMenu;
