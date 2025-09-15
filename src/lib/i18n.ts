import { writable, get } from 'svelte/store';

// Default and SSR-safe: English
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

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 365) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export async function setLocale(lc: string) {
  if (lc === get(locale)) return;
  const key = `./translations/${lc}.json`;
  const loader = loaders[key];
  if (!loader) {
    // Fallback to English if locale file missing
    locale.set('en');
    dictStore.set(en as Dict);
    setCookie('locale', 'en');
    return;
  }
  try {
    const mod = await loader();
    dictStore.set((mod?.default || mod) as Dict);
    locale.set(lc);
    setCookie('locale', lc);
  } catch {
    // Fallback to English on error
    locale.set('en');
    dictStore.set(en as Dict);
    setCookie('locale', 'en');
  }
}

export function initLocale(defaultLocale = 'en') {
  try {
    const saved = getCookie('locale');
    if (saved) void setLocale(saved);
    else void setLocale(defaultLocale);
  } catch {
    void setLocale(defaultLocale);
  }
}

export function t(key: string, params?: Record<string, any>): string {
  const dict = get(dictStore);
  const val = deepGet(dict, key);
  if (typeof val === 'string') return format(val, params);
  // fallback to key for missing
  return key;
}
