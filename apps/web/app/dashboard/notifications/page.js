'use client';

import NextLink from 'next/link';
import { useApp } from '@/components/Providers';
import { useLoad } from '@/components/useLoad';
import { api } from '@/lib/api';
import { dateTime } from '@ghotok/shared';
import { Alert, Empty, Spinner } from '@/components/ui';
import { Bell } from '@/components/Icons';

export default function Notifications() {
  const { t, lang, refreshUnread } = useApp();
  const { data, error, loading, setData } = useLoad('/me/notifications');
  const n = t.notif;

  const readAll = async () => {
    await api('/me/notifications/read-all', { method: 'POST' });
    setData((d) => ({ ...d, unread: 0, items: d.items.map((i) => ({ ...i, read: true })) }));
    refreshUnread();
  };

  const open = (x) => {
    if (x.read) return;
    api(`/me/notifications/${x._id}/read`, { method: 'POST' })
      .then(refreshUnread)
      .catch(() => {});
    setData((d) => ({
      ...d,
      unread: Math.max(0, d.unread - 1),
      items: d.items.map((i) => (i._id === x._id ? { ...i, read: true } : i)),
    }));
  };

  return (
    <>
      <div className="row between wrap gap-12">
        <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
          {n.title}
        </h1>
        {data?.unread > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={readAll}>
            {n.markRead}
          </button>
        )}
      </div>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <Alert kind="error">{error.message}</Alert>
      ) : !data.items.length ? (
        <Empty>{n.empty}</Empty>
      ) : (
        <div className="card stack" style={{ padding: '8px 28px' }}>
          {data.items.map((x) => (
            <div key={x._id} className="list-row" style={{ alignItems: 'flex-start' }}>
              <span className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: x.read ? 'var(--muted)' : 'var(--rose-text)', paddingTop: 2 }}>
                  <Bell size={20} />
                </span>
                <span className="stack gap-4">
                  <b style={{ fontWeight: x.read ? 600 : 800 }}>{x.title?.[lang] || x.title?.en}</b>
                  <span className="small muted">{x.body?.[lang] || x.body?.en}</span>
                  <span className="tiny muted">{dateTime(x.createdAt, lang)}</span>
                </span>
              </span>
              {x.link ? (
                <NextLink
                  href={x.link}
                  onClick={() => open(x)}
                  className="small"
                  style={{ color: 'var(--rose-text)', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {t.common.view} →
                </NextLink>
              ) : (
                !x.read && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(x)}>
                    {n.markOne}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
