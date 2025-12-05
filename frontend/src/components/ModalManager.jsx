
import React from 'react';
import XPModal from './XPModal';
import GotoModal from './GotoModal';
import FileBrowserModal from './FileBrowserModal';
import { addSystemLog } from '../store/debuggerSlice';

const ModalManager = ({
    activeModal, setActiveModal,
    settings, selectedAddresses,
    commentInput, setCommentInput, handleCommentOk,
    patchInput, setPatchInput, handleEditOk,
    fillByte, setFillByte, handleFillOk, fillInputRef,
    handleGoTo, handleResetDB, handleFileOpen,
    saveSetting,
    dispatch,
    apiCall,
    targetName
}) => {

    const handleSaveSetting = (k, v) => {
        saveSetting(k, v);
        dispatch(addSystemLog(`Setting changed: ${k} = ${v}`));
    };

    return (
        <>
            {activeModal === 'file_browser' && (
                <FileBrowserModal
                    onClose={() => setActiveModal(null)}
                    onSelectFile={handleFileOpen}
                    apiCall={apiCall}
                />
            )}

            {activeModal === 'options' && (
                <XPModal title="Options" onClose={() => setActiveModal(null)} onOk={() => setActiveModal(null)}>
                    <OptionTabs settings={settings} handleSaveSetting={handleSaveSetting} apiCall={apiCall} />
                </XPModal>
            )}

            {activeModal === 'comment' && (
                <XPModal title="Add Comment" onClose={() => setActiveModal(null)} onOk={handleCommentOk}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label>Address: {selectedAddresses[0] || '?'}</label>
                        <input
                            autoFocus
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            style={{ width: '250px' }}
                        />
                    </div>
                </XPModal>
            )}

            {activeModal === 'edit' && (
                <XPModal title="Edit Code" onClose={() => setActiveModal(null)} onOk={handleEditOk}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label>Hex:</label>
                        <input type="text" value={patchInput.hex} onChange={e => setPatchInput({ ...patchInput, hex: e.target.value })} style={{ width: '250px' }} />
                        <label>ASCII:</label>
                        <input type="text" value={patchInput.ascii} readOnly style={{ width: '250px', background: '#eee' }} />
                        <label>
                            <input type="checkbox" /> Keep size
                        </label>
                    </div>
                </XPModal>
            )}

            {activeModal === 'fill' && (
                <XPModal title="Fill with byte" onClose={() => setActiveModal(null)} onOk={handleFillOk}>
                    <label>Byte (Hex):</label>
                    <input
                        ref={fillInputRef}
                        autoFocus
                        type="text"
                        value={fillByte}
                        onChange={e => setFillByte(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        maxLength={4}
                        style={{ width: '60px' }}
                    />
                    <div style={{ fontSize: '10px', color: '#666' }}>Examples: 0x90, 90h, 90</div>
                </XPModal>
            )}

            {activeModal === 'goto' && (
                <GotoModal onClose={() => setActiveModal(null)} onOk={handleGoTo} />
            )}

            {activeModal === 'confirm_reset' && (
                <XPModal title="Confirm" onClose={() => setActiveModal(null)} onOk={() => { handleResetDB(); setActiveModal(null); }}>
                    <div>Are you sure you want to delete the database and all analysis data for <b>{targetName}</b>?</div>
                </XPModal>
            )}
        </>
    );
};

const OptionTabs = ({ settings, handleSaveSetting, apiCall }) => {
    const [activeTab, setActiveTab] = React.useState('appearance');

    // Tab Headers Style
    const tabHeaderStyle = { display: 'flex', borderBottom: '1px solid #fff', marginBottom: '10px' };
    const tabBtnStyle = (active) => ({
        padding: '5px 10px',
        cursor: 'pointer',
        background: active ? '#d4d0c8' : '#e0ddd8',
        border: '1px solid #fff',
        borderBottom: active ? 'none' : '1px solid #fff',
        fontWeight: active ? 'bold' : 'normal'
    });

    return (
        <div style={{ width: '100%' }}>
            <div style={tabHeaderStyle}>
                <div style={tabBtnStyle(activeTab === 'appearance')} onClick={() => setActiveTab('appearance')}>
                    Appearance
                </div>
                <div style={tabBtnStyle(activeTab === 'application')} onClick={() => setActiveTab('application')}>
                    Application
                </div>
            </div>

            {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label title="Show comments from GDB disassembly output">
                        <input
                            type="checkbox"
                            checked={settings.showGdbComments}
                            onChange={(e) => handleSaveSetting('showGdbComments', e.target.checked)}
                        />
                        Show GDB comments
                    </label>
                    <label title="Swap source and destination in instruction display">
                        <input
                            type="checkbox"
                            checked={settings.swapArguments}
                            onChange={(e) => handleSaveSetting('swapArguments', e.target.checked)}
                        />
                        Swap arguments (dst, src)
                    </label>
                    <label title="Case sensitivity for disassembly listing">Case:
                        <select
                            value={settings.listingCase}
                            onChange={(e) => handleSaveSetting('listingCase', e.target.value)}
                        >
                            <option value="upper">UPPERCASE</option>
                            <option value="lower">lowercase</option>
                        </select>
                    </label>
                    <label title="Format of register names in display">Register Naming:
                        <select
                            value={settings.registerNaming}
                            onChange={(e) => handleSaveSetting('registerNaming', e.target.value)}
                        >
                            <option value="plain">Plain (eax)</option>
                            <option value="percent">GDB (%eax)</option>
                        </select>
                    </label>
                    <label title="Format when copying hex bytes to clipboard">Copy Hex Format:
                        <select
                            value={settings.copyHexFormat}
                            onChange={(e) => handleSaveSetting('copyHexFormat', e.target.value)}
                        >
                            <option value="raw">Raw (AABB)</option>
                            <option value="space">Space (AA BB)</option>
                            <option value="prefix">Prefix (0xAA)</option>
                            <option value="python">Python (\xAA)</option>
                        </select>
                    </label>
                    <label title="Display format for immediate numbers">Number Format:
                        <select
                            value={settings.numberFormat}
                            onChange={(e) => handleSaveSetting('numberFormat', e.target.value)}
                        >
                            <option value="auto">Auto ($0xA)</option>
                            <option value="hex_clean">Hex (0xA)</option>
                            <option value="hex_asm">Asm (0Ah)</option>
                            <option value="dec">Decimal (10)</option>
                        </select>
                    </label>
                    <label title="Display format for negative numbers">Negative Format:
                        <select
                            value={settings.negativeFormat}
                            onChange={(e) => handleSaveSetting('negativeFormat', e.target.value)}
                        >
                            <option value="unsigned">Unsigned (FFFFFFF6)</option>
                        </select>
                    </label>
                    <label title="Syntax for disassembly instructions (Intel/AT&T)">Disassembly Syntax:
                        <select
                            value={settings.disassemblyFlavor || 'att'}
                            onChange={(e) => handleSaveSetting('disassemblyFlavor', e.target.value)}
                        >
                            <option value="att">AT&T (Default)</option>
                            <option value="intel">Intel</option>
                        </select>
                    </label>
                </div>
            )}

            {activeTab === 'application' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label title="Output application logs to the browser developer console">
                        <input
                            type="checkbox"
                            checked={settings.browserConsoleLogs || false}
                            onChange={(e) => handleSaveSetting('browserConsoleLogs', e.target.checked)}
                        />
                        Browser console logs
                    </label>
                    <hr style={{ width: '100%', borderColor: '#fff' }} />
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to DELETE ALL databases for ALL targets? This cannot be undone.")) {
                                apiCall('/database/reset_all', {}, 'POST').then(res => {
                                    if (res.deleted_count !== undefined) {
                                        alert(`Deleted ${res.deleted_count} databases.`);
                                    }
                                });
                            }
                        }}
                        style={{ marginTop: '10px', padding: '5px' }}
                    >
                        Clear All Target Data
                    </button>
                </div>
            )}
        </div>
    );
};

export default ModalManager;
