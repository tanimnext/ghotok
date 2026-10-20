'use client';

import { useApp } from './Providers';
import { useLoad } from './useLoad';
import BiodataCard from './BiodataCard';
import { Alert, Empty, Spinner } from './ui';
import { api } from '@/lib/api';
import { digits } from '@/lib/format';

/** A grid of biodata cards loaded from an API list endpoint. */
export default function CardList({ path, title, empty, removable, footer }) {
  const { t, lang } = useApp();
  const { data, error, loading, setData } = useLoad(path);

  const remove = async (code) => {
    await api(`/biodatas/${code}/favorite`, { method: 'DELETE' });
    setData((d) => ({ ...d, items: d.items.filter((i) => i.code !== code), total: d.total - 1 }));
  };

  return (
    <>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>{title}</h1>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error.message}</Alert> : !data.items.length ? <Empty>{empty}</Empty> : (
        <div className="grid grid-auto-250">
          {data.items.map((b) => (
            <BiodataCard key={b._id} b={b} t={t} lang={lang}
              action={removable ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(b.code)}>{t.lists.remove}</button> : null} />
          ))}
        </div>
      )}
      {data && footer?.(data, (n) => digits(n, lang))}
    </>
  );
}
