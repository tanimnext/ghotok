/**
 * Read-only biodata, section by section. No hooks, so it renders on the server (website)
 * and in the browser (admin) alike.
 */
import { sectionRows, viewSections } from './format.js';

export function BiodataSection({ section, biodata, lang, empty = null }) {
  const rows = sectionRows(section, biodata, lang);
  if (!rows.length) return empty;
  return (
    <section className="card stack gap-12 bio-section" id={`section-${section.key}`}>
      <h2 className="h3">{section.title[lang]}</h2>
      <dl className="kv" style={{ margin: 0 }}>
        {rows.map((r) => (
          <div key={r.key} className={String(r.value).length > 80 ? 'kv-wide' : undefined}>
            <dt>{r.label}</dt>
            <dd style={{ whiteSpace: 'pre-line' }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** @param showPrivate also render the contact and pledge sections (owner / staff views) */
export function BiodataView({ biodata, lang, showPrivate = false, only }) {
  const sections = viewSections({ showPrivate }).filter((s) => !only || only.includes(s.key));
  return (
    <>
      {sections.map((s) => (
        <BiodataSection key={s.key} section={s} biodata={biodata} lang={lang} />
      ))}
    </>
  );
}
