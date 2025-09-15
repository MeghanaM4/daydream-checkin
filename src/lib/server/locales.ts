// Enumerate available translation locales based on files in src/lib/translations

const files = import.meta.glob('../translations/*.json');

function extract(codePath: string): string | null {
  const m = codePath.match(/([^\/]+)\.json$/);
  return m ? m[1] : null;
}

export const SUPPORTED_LOCALES: Set<string> = new Set(
  Object.keys(files)
    .map(extract)
    .filter((x): x is string => !!x)
);
