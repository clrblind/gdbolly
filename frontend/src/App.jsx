
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
import SystemLogWindow from './components/SystemLogWindow';
import ProgressModal from './components/ProgressModal';

function App() {
  const {
    // State
    status, settings, selectedAddresses, showSystemLog,
    currentThreadId, layout, contextMenu, activeModal,
    commentInput, patchInput, fillByte, fillInputRef, targetName,
    loadingProgress, version,

    // Setters & Handlers
    setContextMenu, setActiveModal, setCommentInput, setPatchInput, setFillByte,
    handleSessionLoad, handleResetDB, handleStep, handleGoTo, handleFileOpen,
    handleEditOk, handleFillOk, handleCommentOk,
    handleMouseDownHorz, handleMouseDownVert, handleDisasmContextMenu,
    toggleLogs, focusDisassembly,
    apiCall, saveSetting, dispatch
  } = useAppLogic();

  return (
    <MainContainer>
      <MainMenu
        handleSessionLoad={handleSessionLoad}
        setActiveModal={setActiveModal}
        toggleLogs={() => toggleLogs(true)}
        focusDisassembly={() => toggleLogs(false)}
        version={version}
      />

      <MainToolbar
        handleSessionLoad={handleSessionLoad}
        handleStep={handleStep}
        apiCall={apiCall}
        toggleLogs={toggleLogs}
        setActiveModal={setActiveModal}
      />

      <Workspace>
        {showSystemLog ? (
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'absolute', top: 0, left: 0, zIndex: 50 }}>
            <SystemLogWindow onClose={() => toggleLogs(false)} />
          </div>
        ) : (
          /* CPU View */
          <>
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
                <div style={{ padding: 5 }}>Memory Dump (Pending...)</div>
              </Panel>
              <VerticalResizer onMouseDown={handleMouseDownVert} />
              <Panel style={{ flex: 1 }}>
                <div style={{ padding: 5 }}>Stack (Pending...)</div>
                items={contextMenu.items}
                onClose={() => setContextMenu(null)}
        />
      )}

                {/* Progress Modal */}
                {loadingProgress && loadingProgress.show && (
                  <ProgressModal message={loadingProgress.message} percent={loadingProgress.percent} />
                )}

                <ModalManager
                  activeModal={activeModal}
                  setActiveModal={setActiveModal}
                  settings={settings}
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
                  handleFileOpen={handleFileOpen}
                  saveSetting={saveSetting}
                  dispatch={dispatch}
                  apiCall={apiCall}
                />

              </MainContainer>
              );
}

              export default App;
