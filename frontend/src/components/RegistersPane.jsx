import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';

const RegRow = styled.div`
  display: flex;
  &:hover { background-color: #eee; }
`;

const RegName = styled.div`
  width: 50px;
  color: #808080; /* Серый как в Olly */
  text-align: right;
  padding-right: 5px;
  font-weight: bold;
`;

const RegVal = styled.div`
  color: #000000;
`;

// Карта имен регистров (GDB шлет номера, нам бы маппинг, но пока выведем как есть или номер)
// Для x86_64 основные: 0=rax, 1=rbx, 2=rcx, 3=rdx... 16=rip
const REG_NAMES = {
    "0": "RAX", "1": "RBX", "2": "RCX", "3": "RDX", "4": "RSI", "5": "RDI", 
    "6": "RBP", "7": "RSP", "16": "RIP", "17": "EFLAGS"
};

const RegistersPane = () => {
  const regs = useSelector(state => state.debug.registers);

  return (
    <div style={{ padding: '5px' }}>
      {regs.map((r) => (
        <RegRow key={r.number}>
          <RegName>{REG_NAMES[r.number] || `r${r.number}`}</RegName>
          <RegVal>{r.value}</RegVal>
        </RegRow>
      ))}
    </div>
  );
};

export default RegistersPane;