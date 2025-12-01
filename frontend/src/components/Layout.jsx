import styled from 'styled-components';

export const Container = styled.div`
  display: grid;
  grid-template-columns: 60% 40%;
  grid-template-rows: 70% 30%;
  height: calc(100vh - 50px); /* 50px под тулбар */
  width: 100vw;
  background-color: #d4d0c8;
  gap: 2px;
  padding: 2px;
  box-sizing: border-box;
`;

export const Panel = styled.div`
  background: white;
  border: 2px inset #fff;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  position: relative;
`;

export const Toolbar = styled.div`
  height: 40px;
  background: #d4d0c8;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid #808080;
  
  button {
    margin-right: 5px;
    padding: 2px 10px;
  }
`;