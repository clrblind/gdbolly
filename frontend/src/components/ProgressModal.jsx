import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalWindow = styled.div`
  background: #d4d0c8;
  border: 2px outset #fff;
  padding: 2px;
  width: 300px;
  box-shadow: 4px 4px 10px rgba(0,0,0,0.5);
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
`;

const TitleBar = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: white;
  padding: 2px 4px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Content = styled.div`
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 20px;
  background: white;
  border: 1px inset #888;
  position: relative;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: #000080;
  width: ${props => props.percent}%;
  transition: width 0.3s ease-in-out;
`;

const Message = styled.div`
  text-align: center;
`;

const ProgressModal = ({ message, percent }) => {
    return (
        <Overlay>
            <ModalWindow>
                <TitleBar>Loading...</TitleBar>
                <Content>
                    <Message>{message}</Message>
                    <ProgressBarContainer>
                        <ProgressBarFill percent={percent} />
                    </ProgressBarContainer>
                </Content>
            </ModalWindow>
        </Overlay>
    );
};

export default ProgressModal;
