import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueAnnouncement } from '../db/hooks';
import type { Level } from '../db/schema';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const LEVELS: Level[] = ['national', 'regional', 'local'];

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

export default function ComposePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetLevel, setTargetLevel] = useState<Level | ''>('');
  const [targetRole, setTargetRole] = useState('');
  const [targetTerritoryId, setTargetTerritoryId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authorId = sessionStorage.getItem('user_id') ?? '';
  const authorName = sessionStorage.getItem('user_name') ?? '';
  const token = sessionStorage.getItem('access_token') ?? '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError('');

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`${file.name} exceeds 10 MB limit`);
        continue;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/api/attachments/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const uploaded: UploadedFile = await res.json();
        setUploadedFiles(prev => [...prev, uploaded]);
      } catch {
        setUploadError(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
      }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);

    await queueAnnouncement({
      type: 'CREATE_ANNOUNCEMENT',
      payload: {
        title,
        body,
        authorId,
        authorName,
        targetLevel: (targetLevel || null) as Level | null,
        targetRole: targetRole || null,
        targetTerritoryId: targetTerritoryId || null,
        attachmentIds: uploadedFiles.map(f => f.id),
      },
    });

    setSubmitting(false);
    navigate('/feed');
  };

  return (
    <div className="page">
      <h1 className="page-title">New Announcement</h1>

      <div className="form-group">
        <label className="form-label">Title *</label>
        <input
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter title…"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea
          className="form-input form-textarea"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your announcement…"
          rows={5}
        />
      </div>

      {/* Attachments */}
      <div className="form-group">
        <label className="form-label">Attachments</label>

        {uploadedFiles.length > 0 && (
          <div className="upload-list">
            {uploadedFiles.map(f => (
              <div key={f.id} className="upload-item">
                <span className="upload-name">{f.fileName}</span>
                <button className="upload-remove" onClick={() => removeFile(f.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : '+ Add file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {uploadError && <p className="form-error">{uploadError}</p>}
      </div>

      {/* Targeting */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Target audience (blank = all members)</legend>

        <div className="form-group">
          <label className="form-label">Level</label>
          <select className="form-input" value={targetLevel} onChange={e => setTargetLevel(e.target.value as Level | '')}>
            <option value="">All levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Role</label>
          <input
            className="form-input"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder="e.g. leader, secretary…"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Territory unit ID</label>
          <input
            className="form-input"
            value={targetTerritoryId}
            onChange={e => setTargetTerritoryId(e.target.value)}
            placeholder="Leave blank for all territories"
          />
        </div>
      </fieldset>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting || !title.trim() || uploading}
      >
        {submitting
          ? 'Queuing…'
          : navigator.onLine
            ? 'Send Announcement'
            : 'Queue for when online'}
      </button>
    </div>
  );
}
