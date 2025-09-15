import { writable, get } from 'svelte/store';

// Eagerly import English as the default so SSR has strings
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will inline JSON
import en from './translations/en.json';

type Dict = Record<string, any>;

export const locale = writable<string>('en');
const dictStore = writable<Dict>(en as Dict);

const loaders: Record<string, () => Promise<any>> = import.meta.glob('./translations/*.json');

function deepGet(obj: any, path: string): any {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function format(str: string, params?: Record<string, any>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

export async function setLocale(lc: string) {
  if (lc === get(locale)) return;
  const key = `./translations/${lc}.json`;
  const loader = loaders[key];
  if (!loader) {
    // Fallback to English if locale file missing
    locale.set('en');
    dictStore.set(en as Dict);
    return;
  }
  try {
    const mod = await loader();
    dictStore.set((mod?.default || mod) as Dict);
    locale.set(lc);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('locale', lc);
    } catch {}
  } catch {
    // Fallback to English on error
    locale.set('en');
    dictStore.set(en as Dict);
  }
}

export function initLocale(defaultLocale = 'en') {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;
    if (saved) setLocale(saved);
    else setLocale(defaultLocale);
  } catch {
    setLocale(defaultLocale);
  }
}

export function t(key: string, params?: Record<string, any>): string {
  const dict = get(dictStore);
  const val = deepGet(dict, key);
  if (typeof val === 'string') return format(val, params);
  // fallback to key for missing
  return key;
}
