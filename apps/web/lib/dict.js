import en from './i18n/en.js';
import bn from './i18n/bn.js';

export const DICTS = { en, bn };
export const LANGS = ['bn', 'en'];
export const DEFAULT_LANG = 'bn';
export const getDict = (lang) => DICTS[lang] || DICTS[DEFAULT_LANG];
