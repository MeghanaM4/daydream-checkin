import type { LayoutLoad } from './$types';
import { setLocale } from '$lib/i18n';

export const load: LayoutLoad = async ({ data }) => {
  if (data.lang) {
    try {
      await setLocale(data.lang);
    } catch {
      // ignore and keep default
    }
  }
  return { lang: data.lang };
};
