
import React, { useState, useEffect } from 'react';
import XPModal from './XPModal';
import styled from 'styled-components';

const FileList = styled.div`
  border: 1px inset #808080;
  background: white;
  height: 250px;
  overflow-y: auto;
  padding: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
`;

const FileItem = styled.div`
  padding: 2px 4px;
  cursor: pointer;
  user-select: none;
  ${props => props.selected && `
    background: #000080;
    color: white;
  `}
  &:hover {
    background: ${props => props.selected ? '#000080' : '#e0e0e0'};
  }
`;

const InfoText = styled.div`
  margin-top: 8px;
  font-size: 11px;
  color: #333;
  padding: 4px;
  background: #f0f0f0;
  border: 1px solid #ccc;
`;

const FileBrowserModal = ({ onClose, onSelectFile, apiCall }) => {
    const [files, setFiles] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadFiles = async () => {
            const result = await apiCall('/targets/list', null, 'GET', false);
            if (result && result.files) {
                setFiles(result.files);
            } else if (result && result.error) {
                setError(`Error: ${result.error}`);
            } else {
                setError('Failed to load file list');
            }
            setLoading(false);
        };
        loadFiles();
    }, [apiCall]);

    const handleOk = () => {
        if (selected) {
            onSelectFile(`/targets/${selected.name}`);
            onClose();
        }
    };

    const handleDoubleClick = (file) => {
        setSelected(file);
        setTimeout(() => {
            onSelectFile(`/targets/${file.name}`);
            onClose();
        }, 100);
    };

    return (
        <XPModal
            title="Open File"
            onClose={onClose}
            onOk={handleOk}
            okDisabled={!selected}
        >
            <div style={{ width: '450px' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                    <strong>Directory:</strong> /targets
                </div>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading files...</div>
                ) : error ? (
                    <div style={{ padding: '20px', color: 'red' }}>{error}</div>
                ) : (
                    <FileList>
                        {files.length === 0 ? (
                            <div style={{ color: '#666', padding: '10px' }}>No files found in /targets</div>
                        ) : (
                            files.map(file => (
                                <FileItem
                                    key={file.name}
                                    selected={selected?.name === file.name}
                                    onClick={() => setSelected(file)}
                                    onDoubleClick={() => handleDoubleClick(file)}
                                >
                                    {file.name}
                                    {!file.executable && <span style={{ color: selected?.name === file.name ? '#ffff00' : '#999' }}> (not executable)</span>}
                                </FileItem>
                            ))
                        )}
                    </FileList>
                )}
                {selected && (
                    <InfoText>
                        <strong>Selected:</strong> {selected.name}<br />
                        <strong>Size:</strong> {(selected.size / 1024).toFixed(1)} KB
                        {!selected.executable && (
                            <div style={{ color: '#cc6600', marginTop: '4px' }}>
                                ⚠ Warning: File is not marked as executable
                            </div>
                        )}
                    </InfoText>
                )}
            </div>
        </XPModal>
    );
};

export default FileBrowserModal;
