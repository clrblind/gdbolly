
import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { REG_NAMES } from '../utils/asmFormatter';

const RegRow = styled.div`
  display: flex;
  &:hover { background-color: #eee; }
`;

const RegName = styled.div`
  width: 50px;
  color: #808080;
  text-align: right;
  padding-right: 5px;
  font-weight: bold;
`;

const RegVal = styled.div`
  color: #000000;
`;

const ScrollableContainer = styled.div`
  overflow: auto;
  width: 100%;
  height: 100%;
  user-select: text;
`;

const RegistersPane = () => {
  const regs = useSelector(state => state.debug.registers);

  return (
    <ScrollableContainer style={{ padding: '5px' }}>
      {regs.map((r) => (
        <RegRow key={r.number}>
          <RegName>{r.name || REG_NAMES[r.number] || `r${r.number}`}</RegName>
          <RegVal>{r.value}</RegVal>
        </RegRow>
      ))}
    </ScrollableContainer>
  );
};

export default RegistersPane;
