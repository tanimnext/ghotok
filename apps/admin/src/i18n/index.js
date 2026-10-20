import en from './en.js';
import bn from './bn.js';

export const DICTS = { en, bn };
export const getDict = (lang) => DICTS[lang === 'en' ? 'en' : 'bn'];
