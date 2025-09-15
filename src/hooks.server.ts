import type { Handle } from '@sveltejs/kit';
import { SUPPORTED_LOCALES } from '$lib/server/locales';

export const handle: Handle = async ({ event, resolve }) => {
  const url = new URL(event.request.url);
  const qLang = url.searchParams.get('lang');
  const cookieLang = event.cookies.get('lang');

  let selected: string | null = null;
  if (qLang && SUPPORTED_LOCALES.has(qLang)) selected = qLang;
  else if (cookieLang && SUPPORTED_LOCALES.has(cookieLang)) selected = cookieLang;

  // If query param present, set/clear cookie accordingly
  if (qLang) {
    if (selected) {
      event.cookies.set('lang', selected, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
    } else {
      event.cookies.delete('lang', { path: '/' });
    }
  }

  event.locals.lang = selected;
  return resolve(event);
};
