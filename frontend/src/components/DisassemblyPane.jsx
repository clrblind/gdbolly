import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';

const Row = styled.div`
  display: flex;
  white-space: pre;
  cursor: default;
  background-color: ${props => props.$active ? '#c0c0c0' : 'transparent'};
  color: ${props => props.$active ? '#000' : 'inherit'};
  
  &:hover { border: 1px solid #000; }
`;

const Address = styled.span` color: #000000; width: 120px; border-right: 1px solid #ddd; padding-left: 5px;`;
const Bytes = styled.span` color: #808080; width: 150px; border-right: 1px solid #ddd; padding-left: 5px; `;
const Opcode = styled.span` color: #000000; font-weight: bold; padding-left: 5px;`;

const DisassemblyPane = () => {
  const instructions = useSelector(state => state.debug.disassembly);

  return (
    <div>
      {instructions.map((inst, idx) => (
        <Row key={idx} $active={idx === 0}> {/* 0-й элемент - текущий IP */}
           <Address>{inst.address}</Address>
           <Bytes>?? ??</Bytes> {/* GDB MI disassemble не всегда отдает байты сразу, заглушка */}
           <Opcode>{inst.inst}</Opcode>
        </Row>
      ))}
    </div>
  );
};

export default DisassemblyPane;