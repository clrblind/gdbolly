
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
import DebugLogWindow from './components/DebugLogWindow';
import ProgressModal from './components/ProgressModal';
import WindowFrame from './components/WindowFrame';
import { useSelector } from 'react-redux';

function App() {
  const {
    // State
    status, settings, selectedAddresses,
    currentThreadId, layout, contextMenu, activeModal,
    commentInput, patchInput, fillByte, fillInputRef, targetName,
    loadingProgress, version, metadata,

    // Setters & Handlers
    setContextMenu, setActiveModal, setCommentInput, setPatchInput, setFillByte,
    handleSessionLoad, handleResetDB, handleStep, handleGoTo, handleFileOpen, handleCloseTarget,
    handleEditOk, handleFillOk, handleCommentOk,
    handleMouseDownHorz, handleMouseDownVert, handleDisasmContextMenu,
    openLogWindow, openDebugLogWindow, focusDisassembly,
    apiCall, saveSetting, dispatch
  } = useAppLogic();

  return (
    <MainContainer>
      <MainMenu
        handleSessionLoad={handleSessionLoad}
        setActiveModal={setActiveModal}

        openLogWindow={openLogWindow}
        openDebugLogWindow={openDebugLogWindow}
        focusDisassembly={focusDisassembly}
        version={version}
      />

      <MainToolbar
        handleSessionLoad={handleSessionLoad}
        handleFileOpen={() => setActiveModal('file_browser')}
        handleCloseTarget={handleCloseTarget}
        handleStep={handleStep}
        apiCall={apiCall}
        openLogWindow={openLogWindow}
        openDebugLogWindow={openDebugLogWindow}
        setActiveModal={setActiveModal}
      />

      <Workspace style={{ position: 'relative', overflow: 'hidden' }}>
        {/* MDI Desktop Layer */}
        {(() => {
          const windows = useSelector(state => state.windows.windows);
          const activeWindowId = useSelector(state => state.windows.activeWindowId);

          return Object.values(windows).map(win => {
            if (win.closed) return null;
            return (
              <WindowFrame
                key={win.id}
                windowState={win}
                isActive={activeWindowId === win.id}
              >
                {win.id === 'cpu' && (
                  /* CPU View - Preserving Layout */
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                      </Panel>
                    </HorizontalSplit>
                  </div>
                )}
                {win.id === 'logs' && <SystemLogWindow onClose={() => dispatch({ type: 'windows/closeWindow', payload: 'logs' })} />}
                {win.id === 'debug_log' && <DebugLogWindow onClose={() => dispatch({ type: 'windows/closeWindow', payload: 'debug_log' })} />}
              </WindowFrame>
            );
          });
        })()}
      </Workspace>

      <StatusBar>
        <div style={{ width: '80px' }}>{status}</div>
        <div style={{ flex: 1 }}>Target: {targetName || 'None'}</div>

        <div style={{ width: '2px', padding: 0, background: 'transparent', border: 'none' }}></div>

        <div style={{ width: '100px' }}>PID: {loadingProgress.show ? '...' : (metadata?.pid || currentThreadId || '')}</div>

        <div style={{ width: '2px', padding: 0, background: 'transparent', border: 'none' }}></div>

        <div style={{ width: '80px' }}>{metadata?.arch || 'Arch'}</div>

        <div style={{ width: '2px', padding: 0, background: 'transparent', border: 'none' }}></div>

        <div style={{ width: '160px' }}>Base: {metadata?.imageBase || '?'}</div>
      </StatusBar>

      {
        contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )
      }

      {/* Progress Modal */}
      {
        loadingProgress && loadingProgress.show && (
          <ProgressModal message={loadingProgress.message} percent={loadingProgress.percent} />
        )
      }

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
        handleSessionLoad={handleSessionLoad}
        saveSetting={saveSetting}
        dispatch={dispatch}
        apiCall={apiCall}
        targetName={targetName}
      />

    </MainContainer >
  );
}

export default App;
