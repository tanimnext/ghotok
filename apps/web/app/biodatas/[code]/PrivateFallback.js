'use client';

import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { BiodataView } from '@ghotok/ui/biodata';
import { useApp } from '@/components/Providers';
import { api } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';

/**
 * Shown when the public API says "not found". The owner or staff can still preview
 * a biodata that is under review or hidden.
 */
export default function PrivateFallback({ code }) {
  const { t, lang, user, authReady } = useApp();
  const [state, setState] = useState({ loading: true, b: null });

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setState({ loading: false, b: null });
      return;
    }
    api(`/biodatas/${encodeURIComponent(code)}`)
      .then((d) => setState({ loading: false, b: d.biodata }))
      .catch(() => setState({ loading: false, b: null }));
  }, [authReady, user, code]);

  if (state.loading)
    return (
      <div className="container empty">
        <Spinner />
      </div>
    );
  if (!state.b) {
    return (
      <div className="container stack gap-16 not-found">
        <h1 className="h2">{t.bio.notFound}</h1>
        <p className="muted">{t.bio.notFoundSub}</p>
        <NextLink href="/biodatas" className="btn btn-primary">
          {t.search.title}
        </NextLink>
      </div>
    );
  }
  return (
    <div className="container stack gap-20 page-pad" style={{ maxWidth: 900 }}>
      <Alert kind="warn">{t.bio.underReview}</Alert>
      <h1 className="h2">{state.b.code}</h1>
      <BiodataView biodata={state.b} lang={lang} />
    </div>
  );
}
