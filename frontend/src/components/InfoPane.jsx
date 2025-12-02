
import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { parseInstruction } from '../utils/asmFormatter';

const Container = styled.div`
  height: 40px; /* Approx 3 lines */
  background: #d4d0c8;
  border-top: 1px solid white;
  border-bottom: 1px solid #808080;
  padding: 2px 5px;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const MainText = styled.div`
  font-weight: bold;
`;

const SubText = styled.div`
  color: #404040;
`;

const InfoPane = () => {
  const selectedAddresses = useSelector(state => state.debug.selectedAddresses);
  const disassembly = useSelector(state => state.debug.disassembly);
  const settings = useSelector(state => state.debug.settings);

  if (selectedAddresses.length === 0) return <Container />;

  const lastAddr = selectedAddresses[selectedAddresses.length - 1];
  const inst = disassembly.find(i => i.address === lastAddr);

  if (!inst) return <Container />;

  const parsed = parseInstruction(inst, settings);
  
  let info = "Instruction";
  let sub = "";

  const mnemonic = parsed.mnemonic.toLowerCase();

  if (mnemonic.startsWith('j')) {
      info = `Jump to ${parsed.operands}`;
      sub = "Conditional jump depends on flags";
      if (mnemonic === 'jmp') sub = "Unconditional Jump";
  } else if (mnemonic.startsWith('call')) {
      info = `Call ${parsed.operands}`;
  } else if (mnemonic.startsWith('ret')) {
      info = "Return from procedure";
  } else if (mnemonic.includes('mov')) {
      info = "Move data";
      sub = parsed.operands;
  }

  return (
    <Container>
      <MainText>{info}</MainText>
      <SubText>{sub}</SubText>
    </Container>
  );
};

export default InfoPane;
