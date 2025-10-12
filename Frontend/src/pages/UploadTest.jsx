// src/pages/UploadTest.jsx
import { useState } from 'react';
import { postForm } from '../lib/api';

export default function UploadTest() {
  const [preview, setPreview] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');

  const onPick = async (e) => {
    setErr('');
    const file = e.target.files?.[0];
    if (!file) return;

    // show local preview
    setPreview(URL.createObjectURL(file));

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await postForm('/api/uploads/image', fd);
      setUrl(res.url);
    } catch (e2) {
      setErr(e2.message || 'Upload failed');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <input type="file" accept="image/*" onChange={onPick} />
      {preview && <img src={preview} alt="" className="border rounded" />}
      {url && (
        <div className="text-sm">
          Uploaded URL: <a className="text-indigo-600" href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
      {err && <div className="text-red-600">{err}</div>}
    </div>
  );
}
