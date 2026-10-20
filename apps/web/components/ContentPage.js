import { getPrefs } from '@/lib/server';
import { PAGES } from '@/lib/content';

export async function contentMetadata(key, path) {
  const { lang } = await getPrefs();
  const p = PAGES[key][lang];
  return { title: p.title, description: p.blocks.find(([k]) => k === 'p')?.[1]?.slice(0, 155), alternates: { canonical: path } };
}

export default async function ContentPage({ pageKey }) {
  const { lang } = await getPrefs();
  const p = PAGES[pageKey][lang];
  return (
    <div className="container" style={{ padding: '48px 28px 0' }}>
      <article className="prose">
        <h1 className="h2">{p.title}</h1>
        {p.blocks.map(([kind, v], i) => {
          if (kind === 'h2') return <h2 key={i}>{v}</h2>;
          if (kind === 'ul') return <ul key={i}>{v.map((x) => <li key={x}>{x}</li>)}</ul>;
          if (kind === 'ol') return <ol key={i}>{v.map((x) => <li key={x}>{x}</li>)}</ol>;
          return <p key={i}>{v}</p>;
        })}
      </article>
    </div>
  );
}
