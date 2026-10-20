import { options, label, districtsOf, upazilasOf } from '@ghotok/shared';

const SORTED_LISTS = new Set(['district', 'upazila']);

/**
 * Options for a select/multiselect field. Location fields with `dependsOn` are filtered by
 * the parent value (districts of a division, upazilas of a district). Labels are localised,
 * including the gendered "widow / widower" label.
 */
export function optionsFor(field, sectionValues = {}, lang = 'bn', type) {
  let list = options(field.options);
  const parent = field.dependsOn ? sectionValues[field.dependsOn] : undefined;
  if (field.options === 'district' && parent) list = districtsOf(parent);
  if (field.options === 'upazila') list = parent ? upazilasOf(parent) : [];
  const out = list.map((o) => ({ value: o.value, label: label(field.options, o.value, lang, type) }));
  if (SORTED_LISTS.has(field.options)) out.sort((a, b) => a.label.localeCompare(b.label, lang === 'bn' ? 'bn' : 'en'));
  return out;
}

/** Keys of fields that depend (directly or indirectly) on `key` within a section. */
export function dependentsOf(section, key) {
  const out = [];
  const walk = (k) => {
    for (const f of section.fields) {
      if (f.dependsOn === k) {
        out.push(f.key);
        walk(f.key);
      }
    }
  };
  walk(key);
  return out;
}
