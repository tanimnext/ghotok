'use client';
/** Private photo and NID upload step of the biodata editor. */
import { useEffect, useState } from 'react';
import { useApp } from '@/components/Providers';
import { api, fileUrl } from '@/lib/api';
import { Alert, StatusPill } from '@/components/ui';
import { Upload } from '@/components/Icons';

const MAX_BYTES = 5 * 1024 * 1024;

export default function PhotoAndNid({ bio, setBio }) {
  const { t } = useApp();
  const fm = t.form;
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const hasPhoto = bio?.hasPhoto;
  const nid = bio?.nid || { status: 'none' };

  useEffect(() => {
    let url;
    let live = true;
    if (hasPhoto && bio?._id) {
      fileUrl(`/files/photo/${bio._id}?v=${bio.updatedAt || ''}`).then((u) => {
        url = u;
        if (live) setPhoto(u);
      });
    } else setPhoto(null);
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasPhoto, bio?._id, bio?.updatedAt]);

  if (!bio) return <Alert kind="info">{fm.saveFirst}</Alert>;

  async function upload(kind, file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErr(fm.fileTooLarge);
      return;
    }
    setBusy(kind);
    setErr('');
    const form = new FormData();
    form.append('file', file);
    try {
      const d = await api(`/me/biodata/${kind}`, { method: 'POST', form });
      setBio((b) =>
        kind === 'photo' ? { ...b, hasPhoto: true, updatedAt: new Date().toISOString() } : { ...b, nid: d.nid }
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  async function removePhoto() {
    setBusy('photo');
    try {
      await api('/me/biodata/photo', { method: 'DELETE' });
      setBio((b) => ({ ...b, hasPhoto: false }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid grid-2" style={{ gap: 20 }}>
      <div className="stack gap-12 sub-card">
        <b>{fm.photoBoxTitle}</b>
        <p className="small muted">{fm.photoHelp}</p>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- private photo from a blob: URL
          <img src={photo} alt="" style={{ borderRadius: 18, maxHeight: 260, objectFit: 'cover' }} />
        )}
        <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
          <Upload size={16} />
          {busy === 'photo' ? t.common.saving : fm.uploadPhoto}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => upload('photo', e.target.files?.[0])}
          />
        </label>
        {hasPhoto && (
          <button
            type="button"
            className="btn btn-ghost btn-sm danger-text"
            style={{ alignSelf: 'flex-start' }}
            onClick={removePhoto}
          >
            {fm.removePhoto}
          </button>
        )}
      </div>
      <div className="stack gap-12 sub-card">
        <div className="row between gap-8">
          <b>{fm.nidTitle}</b>
          <StatusPill status={nid.status}>{fm.nidStatus[nid.status]}</StatusPill>
        </div>
        <p className="small muted">{fm.nidHelp}</p>
        {nid.note && nid.status === 'rejected' && <Alert kind="warn">{nid.note}</Alert>}
        {nid.status !== 'verified' && (
          <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
            <Upload size={16} />
            {busy === 'nid' ? t.common.saving : fm.uploadNid}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={(e) => upload('nid', e.target.files?.[0])}
            />
          </label>
        )}
      </div>
      {err && (
        <div style={{ gridColumn: '1 / -1' }}>
          <Alert kind="error">{err}</Alert>
        </div>
      )}
    </div>
  );
}
