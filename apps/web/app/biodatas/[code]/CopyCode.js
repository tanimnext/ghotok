'use client';
import { useState } from 'react';
import { useApp } from '@/components/Providers';

/** Small "copy biodata number" button next to the code. */
export default function CopyCode({ code }) {
  const { t } = useApp();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm no-print" onClick={copy} aria-live="polite">
      {done ? t.bio.codeCopied : t.bio.copyCode}
    </button>
  );
}
