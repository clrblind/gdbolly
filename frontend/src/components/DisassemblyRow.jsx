
import React from 'react';
import styled from 'styled-components';
import { REG_PATTERN } from '../utils/asmFormatter';

const Row = styled.div`
  display: flex;
  white-space: pre;
  height: 16px;
  line-height: 16px;
  user-select: none;
  border: 1px solid transparent; 

  background-color: ${props => 
    props.$selected ? '#000080' : 
    props.$modified ? '#000000' : 
    props.$current ? '#c0c0c0' : 'transparent'
  };
  
  color: ${props => 
    props.$selected ? '#ffffff' : 
    props.$modified ? '#ff0000' : 
    props.$current ? '#000000' : 'inherit'
  };

  &:hover {
    border-color: ${props => (!props.$selected && !props.$current && !props.$modified) ? '#000' : 'transparent'};
  }
`;

const Cell = styled.div`
  padding-left: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-right: 1px solid #d4d0c8;
  flex-shrink: 0;
  box-sizing: border-box;
`;

const Mnemonic = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : props.$isCall ? '#0000ff' : props.$isRet ? '#ff0000' : '#000'};
  font-weight: ${props => (props.$isCall || props.$isRet) ? 'bold' : 'normal'};
`;

const Operands = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#000'};
`;

const CommentText = styled.span`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#808080'};
`;

const HexDump = styled.div`
  color: ${props => props.$selected ? '#fff' : props.$modified ? '#ff0000' : '#808080'};
`;

const highlightRegisters = (text) => {
    const regRegex = new RegExp(`\\b(${REG_PATTERN})\\b`, 'gi');
    const parts = text.split(regRegex);
    return parts.map((part, i) => {
        if (part.match(regRegex)) {
            return <b key={i}>{part}</b>;
        }
        return part;
    });
};

const DisassemblyRow = ({ 
    inst, 
    parsed, 
    colWidths, 
    isCurrent, 
    isSelected, 
    isModified, 
    comment,
    onClick,
    onContextMenu,
    onDoubleClick,
    onMouseDown,
    onMouseUp,
    onMouseEnter
}) => {
    const { mnemonic, operands } = parsed;
    const isCall = mnemonic.toLowerCase().startsWith('call');
    const isRet = mnemonic.toLowerCase().startsWith('ret');
    const hexDump = inst.opcodes || "??";

    return (
        <Row 
            $current={isCurrent} 
            $selected={isSelected}
            $modified={isModified}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseEnter={onMouseEnter}
        >
            <Cell style={{ width: colWidths[0] }}>{inst.address}</Cell>
            <Cell style={{ width: colWidths[1] }}>
                <HexDump $selected={isSelected} $modified={isModified}>{hexDump}</HexDump>
            </Cell> 
            <Cell style={{ width: colWidths[2] }}>
                <Mnemonic $isCall={isCall} $isRet={isRet} $selected={isSelected} $modified={isModified}>{mnemonic}</Mnemonic>
                &nbsp;
                <Operands $selected={isSelected} $modified={isModified}>{highlightRegisters(operands)}</Operands>
            </Cell>
            <Cell style={{ width: colWidths[3] }}>
                <CommentText $selected={isSelected} $modified={isModified}>{comment}</CommentText>
            </Cell>
        </Row>
    );
};

export default DisassemblyRow;
