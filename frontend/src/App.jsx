
import React from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { 
  MainContainer, StatusBar,
  Workspace, HorizontalSplit, Panel,
  VerticalResizer, HorizontalResizer
} from './components/Layout';

import MainMenu from './components/MainMenu';
import MainToolbar from './components/MainToolbar';
import ModalManager from './components/ModalManager';
import RegistersPane from './components/RegistersPane';
import DisassemblyPane from './components/DisassemblyPane';
import InfoPane from './components/InfoPane';
import ContextMenu from './components/ContextMenu';

function App() {
  const {
    // State
    status, settings, selectedAddresses, systemLogs,
    currentThreadId, layout, contextMenu, activeModal,
    commentInput, patchInput, fillByte, fillInputRef,
    
    // Setters & Handlers
    setContextMenu, setActiveModal, setCommentInput, setPatchInput, setFillByte,
    handleSessionLoad, handleResetDB, handleStep, handleGoTo,
    handleEditOk, handleFillOk, handleCommentOk,
    handleMouseDownHorz, handleMouseDownVert, handleDisasmContextMenu,
    apiCall, saveSetting, dispatch
  } = useAppLogic();

  return (
    <MainContainer>
      <MainMenu 
        handleSessionLoad={handleSessionLoad} 
        setActiveModal={setActiveModal} 
      />

      <MainToolbar 
        handleSessionLoad={handleSessionLoad} 
        handleStep={handleStep} 
        apiCall={apiCall} 
        setActiveModal={setActiveModal} 
      />

      <Workspace>
        <HorizontalSplit style={{ height: `${layout.topHeightPercent}%` }}>
          <Panel style={{ width: `${layout.leftWidthPercent}%` }}>
            <DisassemblyPane onContextMenu={handleDisasmContextMenu} />
            <InfoPane />
          </Panel>
          <VerticalResizer onMouseDown={handleMouseDownVert} />
          <Panel style={{ flex: 1 }}>
            <RegistersPane />
          </Panel>
        </HorizontalSplit>

        <HorizontalResizer onMouseDown={handleMouseDownHorz} />

        <HorizontalSplit style={{ flex: 1 }}>
          <Panel style={{ width: `${layout.leftWidthPercent}%` }}>
             <div style={{padding: 5}}>Memory Dump (Pending...)</div>
          </Panel>
          <VerticalResizer onMouseDown={handleMouseDownVert} />
          <Panel style={{ flex: 1 }}>
             <div style={{padding: 5}}>Stack (Pending...)</div>
          </Panel>
        </HorizontalSplit>
      </Workspace>

      <StatusBar>
        <div style={{width: '80px'}}>{status}</div>
        <div style={{flex: 1}}>Target: hello.exe</div>
        <div style={{width: '100px'}}>Thread: {currentThreadId || ''}</div>
      </StatusBar>

      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            items={contextMenu.items} 
            onClose={() => setContextMenu(null)} 
          />
      )}
      
      <ModalManager 
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        settings={settings}
        systemLogs={systemLogs}
        selectedAddresses={selectedAddresses}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        handleCommentOk={handleCommentOk}
        patchInput={patchInput}
        setPatchInput={setPatchInput}
        handleEditOk={handleEditOk}
        fillByte={fillByte}
        setFillByte={setFillByte}
        handleFillOk={handleFillOk}
        fillInputRef={fillInputRef}
        handleGoTo={handleGoTo}
        handleResetDB={handleResetDB}
        saveSetting={saveSetting}
        dispatch={dispatch}
      />

    </MainContainer>
  );
}

export default App;
