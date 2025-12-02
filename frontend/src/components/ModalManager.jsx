
import React from 'react';
import XPModal from './XPModal';
import GotoModal from './GotoModal';

const ModalManager = ({ 
    activeModal, setActiveModal, 
    settings, selectedAddresses,
    commentInput, setCommentInput, handleCommentOk,
    patchInput, setPatchInput, handleEditOk,
    fillByte, setFillByte, handleFillOk, fillInputRef,
    handleGoTo, handleResetDB,
    saveSetting, 
    dispatch
}) => {

  return (
    <>
      {activeModal === 'options' && (
          <XPModal title="Options" onClose={() => setActiveModal(null)} onOk={() => setActiveModal(null)}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <label>
                      <input 
                        type="checkbox" 
                        checked={settings.showGdbComments} 
                        onChange={(e) => saveSetting('showGdbComments', e.target.checked)}
                      /> 
                      Show GDB comments
                  </label>
                  <label>
                      <input 
                        type="checkbox" 
                        checked={settings.swapArguments} 
                        onChange={(e) => saveSetting('swapArguments', e.target.checked)}
                      /> 
                      Swap arguments (dst, src)
                  </label>
                  <label>Case: 
                      <select 
                        value={settings.listingCase}
                        onChange={(e) => saveSetting('listingCase', e.target.value)}
                      >
                          <option value="upper">UPPERCASE</option>
                          <option value="lower">lowercase</option>
                      </select>
                  </label>
                  <label>Register Naming: 
                      <select 
                        value={settings.registerNaming}
                        onChange={(e) => saveSetting('registerNaming', e.target.value)}
                      >
                          <option value="plain">Plain (eax)</option>
                          <option value="percent">GDB (%eax)</option>
                      </select>
                  </label>
                  <label>Copy Hex Format: 
                      <select 
                        value={settings.copyHexFormat}
                        onChange={(e) => saveSetting('copyHexFormat', e.target.value)}
                      >
                          <option value="raw">Raw (AABB)</option>
                          <option value="space">Space (AA BB)</option>
                          <option value="prefix">Prefix (0xAA)</option>
                          <option value="python">Python (\xAA)</option>
                      </select>
                  </label>
                  <label>Number Format: 
                      <select 
                        value={settings.numberFormat}
                        onChange={(e) => saveSetting('numberFormat', e.target.value)}
                      >
                          <option value="auto">Auto ($0xA)</option>
                          <option value="hex_clean">Hex (0xA)</option>
                          <option value="hex_asm">Asm (0Ah)</option>
                          <option value="dec">Decimal (10)</option>
                      </select>
                  </label>
                  <label>Negative Format: 
                      <select 
                        value={settings.negativeFormat}
                        onChange={(e) => saveSetting('negativeFormat', e.target.value)}
                      >
                          <option value="signed">Signed (-0xA)</option>
                          <option value="unsigned">Unsigned (FFFFFFF6)</option>
                      </select>
                  </label>
              </div>
          </XPModal>
      )}

      {activeModal === 'comment' && (
          <XPModal title="Add Comment" onClose={() => setActiveModal(null)} onOk={handleCommentOk}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                 <label>Address: {selectedAddresses[0] || '?'}</label>
                 <input 
                    autoFocus
                    type="text" 
                    value={commentInput} 
                    onChange={(e) => setCommentInput(e.target.value)} 
                    style={{width: '250px'}}
                 />
             </div>
          </XPModal>
      )}

      {activeModal === 'edit' && (
          <XPModal title="Edit Code" onClose={() => setActiveModal(null)} onOk={handleEditOk}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                 <label>Hex:</label>
                 <input type="text" value={patchInput.hex} onChange={e=>setPatchInput({...patchInput, hex: e.target.value})} style={{width: '250px'}} />
                 <label>ASCII:</label>
                 <input type="text" value={patchInput.ascii} readOnly style={{width: '250px', background: '#eee'}} />
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
                onChange={e=>setFillByte(e.target.value)} 
                onFocus={(e) => e.target.select()}
                maxLength={4} 
                style={{width: '60px'}} 
             />
             <div style={{fontSize: '10px', color: '#666'}}>Examples: 0x90, 90h, 90</div>
          </XPModal>
      )}
      
      {activeModal === 'goto' && (
          <GotoModal onClose={() => setActiveModal(null)} onOk={handleGoTo} />
      )}
      
      {activeModal === 'confirm_reset' && (
          <XPModal title="Confirm" onClose={() => setActiveModal(null)} onOk={() => { handleResetDB(); setActiveModal(null); }}>
              <div>Are you sure you want to delete the database and all analysis data?</div>
          </XPModal>
      )}
    </>
  );
};

export default ModalManager;
