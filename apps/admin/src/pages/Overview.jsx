import { Link } from 'react-router-dom';
import { useApp, useLoad } from '../lib/app.jsx';
import { num, taka, digits, date, statusLabel } from '@ghotok/shared';
import { Alert, PageHead, Spinner } from '../components/ui.jsx';

const QUEUE_LINKS = {
  paymentsPending: '/payments',
  biodatasPending: '/biodatas',
  nidPending: '/nid',
  reportsOpen: '/reports',
  recoveryPending: '/recovery',
  refundsPending: '/refunds',
  ticketsOpen: '/tickets',
  reportsUrgent: '/reports',
  contactNew: '/contact',
};

function Bars({ values, gold, labelFor }) {
  const max = Math.max(1, ...values.map((v) => v.v));
  return (
    <div
      className={`bars${gold ? ' gold' : ''}`}
      role="img"
      aria-label={values.map((v) => `${v.d}: ${v.v}`).join(', ')}
    >
      {values.map((v) => (
        <span key={v.d} title={labelFor(v)} style={{ height: `${(v.v / max) * 100}%` }} />
      ))}
    </div>
  );
}

export default function Overview() {
  const { t, lang } = useApp();
  const a = t;
  const { data, error, loading } = useLoad('/admin/overview');
  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error.message}</Alert>;

  const series = data.series;
  return (
    <>
      <PageHead title={a.nav.overview} sub={a.overviewSub} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {Object.entries(data.queues).map(([k, v]) => (
          <Link key={k} to={QUEUE_LINKS[k]} className="kpi">
            <span className="small muted" style={{ fontWeight: 600 }}>
              {a.q[k]}
            </span>
            <span className="v">{num(v, lang)}</span>
          </Link>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {Object.entries(data.totals).map(([k, v]) => (
          <div key={k} className="kpi">
            <span className="small muted" style={{ fontWeight: 600 }}>
              {a.totals[k]}
            </span>
            <span className="v" style={{ color: 'var(--ink)' }}>
              {k === 'revenue30' ? taka(v, lang) : num(v, lang)}
            </span>
          </div>
        ))}
      </div>
      <div className="row wrap gap-24" style={{ alignItems: 'stretch' }}>
        <section className="card stack gap-16" style={{ flex: '1 1 380px' }}>
          <h2 className="h3">{a.signups}</h2>
          <Bars
            values={series.map((s) => ({ d: s.day, v: s.signups }))}
            labelFor={(v) => `${date(v.d, lang)}: ${digits(v.v, lang)}`}
          />
        </section>
        <section className="card stack gap-16" style={{ flex: '1 1 380px' }}>
          <h2 className="h3">{a.revenue}</h2>
          <Bars
            gold
            values={series.map((s) => ({ d: s.day, v: s.revenue }))}
            labelFor={(v) => `${date(v.d, lang)}: ${taka(v.v, lang)}`}
          />
        </section>
      </div>
      <section className="card stack gap-12">
        <h2 className="h3">{a.byStatus}</h2>
        <div className="row wrap gap-24">
          {Object.entries(data.biodataByStatus).map(([k, v]) => (
            <Link key={k} to={`/biodatas?status=${k}`} className="stat" style={{ minWidth: 150 }}>
              <span className="stat-num">{num(v, lang)}</span>
              <span className="small muted">{statusLabel('biodata', k, lang) || k}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
