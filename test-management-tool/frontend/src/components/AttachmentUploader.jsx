import { useState, useRef } from 'react';
import { Upload, File, Image, X, Download, Loader, Paperclip } from 'lucide-react';
import { attachmentApi } from '../api';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function AttachmentUploader({ entityType, entityId, readOnly = false }) {
  const [attachments, setAttachments]   = useState([]);
  const [uploading,   setUploading]     = useState(false);
  const [dragging,    setDragging]      = useState(false);
  const [loaded,      setLoaded]        = useState(false);
  const [error,       setError]         = useState('');
  const inputRef = useRef(null);

  // Load on mount
  useState(() => {
    if (!entityId) return;
    const loader = entityType === 'TEST_EXECUTION'
      ? attachmentApi.listForExecution
      : attachmentApi.listForDefect;
    loader(entityId)
      .then(r => { setAttachments(r.data.data || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  });

  const upload = async (files) => {
    if (!entityId || readOnly) return;
    setUploading(true); setError('');
    const uploader = entityType === 'TEST_EXECUTION'
      ? attachmentApi.uploadToExecution
      : attachmentApi.uploadToDefect;
    try {
      const results = await Promise.all(Array.from(files).map(f => uploader(entityId, f)));
      const newAtts = results.map(r => r.data.data).filter(Boolean);
      setAttachments(prev => [...prev, ...newAtts]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await attachmentApi.delete(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    upload(e.dataTransfer.files);
  };

  const isImage = (mime) => mime?.startsWith('image/');

  return (
    <div>
      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
            borderRadius: 10, padding: '20px 16px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 12, transition: 'all 0.15s',
            background: dragging ? 'rgba(88,166,255,0.05)' : 'transparent',
          }}
        >
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => upload(e.target.files)} />
          {uploading ? (
            <div style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Uploading…
            </div>
          ) : (
            <>
              <Upload size={20} style={{ color: 'var(--text3)', marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Drag & drop files or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>browse</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                Screenshots, PDFs, documents — max 10MB each
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '8px 12px', background: 'rgba(248,81,73,0.1)',
          border: '1px solid rgba(248,81,73,0.3)', borderRadius: 7,
          fontSize: 12, color: '#f85149', marginBottom: 10,
        }}>{error}</div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <Paperclip size={11} /> {attachments.length} attachment(s)
            </div>
          )}
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: 'var(--bg-raised)',
              border: '1px solid var(--border)', borderRadius: 8,
            }}>
              {isImage(att.mimeType)
                ? <Image size={16} style={{ color: '#58a6ff', flexShrink: 0 }} />
                : <File size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {att.fileName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  {formatBytes(att.fileSizeBytes)} · {att.uploadedByName}
                </div>
              </div>
              <a href={att.downloadUrl} download target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}
                title="Download">
                <Download size={14} />
              </a>
              {!readOnly && (
                <button onClick={() => handleDelete(att.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', display: 'flex', alignItems: 'center',
                }} title="Delete">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
