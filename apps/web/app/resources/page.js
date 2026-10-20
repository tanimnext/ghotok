import { digits, num } from '@ghotok/shared';
import { getPrefs, apiGet } from '@/lib/server';
import { API_URL } from '@/lib/api';
import { Download } from '@/components/Icons';

export async function generateMetadata() {
  const { t } = await getPrefs();
  return { title: t.resources.title, description: t.resources.sub, alternates: { canonical: '/resources' } };
}

const kb = (bytes, lang) => (bytes ? `${digits(Math.max(1, Math.round(bytes / 1024)), lang)} KB` : '');

export default async function ResourcesPage() {
  const { lang, t } = await getPrefs();
  const data = await apiGet('/resources', { revalidate: 120 });
  const items = data?.items || [];
  return (
    <div className="container stack gap-24" style={{ padding: '48px 28px 0' }}>
      <div className="stack gap-12" style={{ maxWidth: 720 }}>
        <span className="eyebrow">{t.resources.kicker}</span>
        <h1 className="h2">{t.resources.title}</h1>
        <p className="lead">{t.resources.sub}</p>
      </div>
      {items.length ? (
        <div className="grid grid-auto-250">
          {items.map((r) => (
            <article key={r.id} className="card stack gap-12">
              {r.hasPreview && (
                // eslint-disable-next-line @next/next/no-img-element -- served by the API with its own caching
                <img
                  src={`${API_URL}/api/resources/${r.id}/preview`}
                  alt=""
                  loading="lazy"
                  className="resource-preview"
                />
              )}
              <h2 className="h3">{r.title[lang]}</h2>
              {r.description?.[lang] && <p className="muted small">{r.description[lang]}</p>}
              <span className="tiny muted">
                {[r.fileName, kb(r.size, lang), `${num(r.downloads, lang)} ${t.resources.downloads}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <a
                className="btn btn-outline btn-sm"
                style={{ alignSelf: 'flex-start' }}
                href={`${API_URL}/api/resources/${r.id}/download`}
              >
                <Download size={16} />
                {t.resources.download}
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="card empty">{data ? t.resources.empty : t.common.error}</p>
      )}
    </div>
  );
}
