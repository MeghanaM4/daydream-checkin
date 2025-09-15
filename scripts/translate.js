#!/usr/bin/env node

/**
 * Translate missing/empty strings from English to a target language file using OpenAI.
 *
 * Usage:
 *   node scripts/translate.js <langCode> [--from=en]
 *
 * Env vars:
 *   OPENAI_API_KEY   Required to use OpenAI
 *   OPENAI_MODEL     Optional (default: gpt-4o-mini)
 *
 * Behavior:
 * - Reads src/lib/translations/en.json
 * - Reads/creates src/lib/translations/<langCode>.json
 * - Finds values that are missing or empty in target
 * - Requests translation for those values only
 * - Preserves {placeholders} and simple HTML tags in strings
 * - Merges and writes updated target file
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const SRC_DIR = path.join(root, 'src', 'lib', 'translations');

function usageAndExit(msg) {
  if (msg) console.error(msg);
  console.error('Usage: node scripts/translate.js <langCode> [--from=en]');
  process.exit(1);
}

function isRecord(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

async function readJson(file) {
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function writeJson(file, obj) {
  const data = JSON.stringify(obj, null, 2) + '\n';
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data, 'utf8');
}

function walkStrings(obj, fn, pathParts = []) {
  if (typeof obj === 'string') {
    fn(pathParts, obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkStrings(v, fn, [...pathParts, i]));
    return;
  }
  if (isRecord(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      walkStrings(v, fn, [...pathParts, k]);
    }
  }
}

function getAt(obj, pathParts) {
  return pathParts.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setAt(obj, pathParts, value) {
  let cur = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (typeof pathParts[i + 1] === 'number') {
      if (!Array.isArray(cur[key])) cur[key] = [];
    } else {
      if (!isRecord(cur[key])) cur[key] = {};
    }
    cur = cur[key];
  }
  const last = pathParts[pathParts.length - 1];
  cur[last] = value;
}

function collectPlaceholders(str) {
  const set = new Set();
  for (const m of str.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) set.add(m[1]);
  return set;
}

function samePlaceholders(src, dst) {
  const a = collectPlaceholders(src);
  const b = collectPlaceholders(dst);
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function stripCodeFences(s) {
  // Remove ```json ... ``` wrappers if present
  const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/m;
  const m = s.match(fence);
  return m ? m[1] : s;
}

async function main() {
  const [, , toLang, ...rest] = process.argv;
  if (!toLang) usageAndExit('Missing <langCode>');

  let fromLang = 'en';
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--from') {
      fromLang = rest[i + 1];
      i++;
    }
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set.');
    process.exit(1);
  }

  const srcPath = path.join(SRC_DIR, `${fromLang}.json`);
  const dstPath = path.join(SRC_DIR, `${toLang}.json`);

  let src;
  try {
    src = await readJson(srcPath);
  } catch (e) {
    console.error(`Failed to read source language file: ${srcPath}`);
    throw e;
  }

  let dst = {};
  try {
    dst = await readJson(dstPath);
  } catch {
    // new file
    dst = {};
  }

  // Build an object (same shape) that only contains strings requiring translation
  const needs = {};
  walkStrings(src, (pathParts, value) => {
    const existing = getAt(dst, pathParts);
    const missing = existing == null || (typeof existing === 'string' && existing.trim() === '');
    if (missing) setAt(needs, pathParts, value);
  });

  // Count pending
  let pendingCount = 0;
  walkStrings(needs, () => pendingCount++);
  if (pendingCount === 0) {
    console.log(`Nothing to translate. ${toLang}.json is up to date.`);
    return;
  }

  // Ask OpenAI to translate the subset in one shot, preserving structure/placeholders
  const system = `You are a professional localization engine. Translate JSON string values from ${fromLang} to ${toLang}.\n` +
    `Rules:\n` +
    `- Return ONLY valid JSON, same structure, keys unchanged.\n` +
    `- Translate values; do not translate {placeholders} or change their names.\n` +
    `- Preserve existing HTML tags (<i>, <button>, etc.) and punctuation.\n` +
    `- Keep capitalization and tone natural for the target language.`;

  const user = JSON.stringify(needs, null, 2);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('OpenAI API error:', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const jsonText = stripCodeFences(content).trim();

  let translatedSubset;
  try {
    translatedSubset = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse JSON from OpenAI response. Raw response:\n', content);
    throw e;
  }

  // Validate placeholders
  const warnings = [];
  walkStrings(needs, (pathParts, srcStr) => {
    const tgtStr = getAt(translatedSubset, pathParts);
    if (typeof tgtStr !== 'string') return;
    if (!samePlaceholders(srcStr, tgtStr)) {
      warnings.push({ path: pathParts.join('.'), src: srcStr, tgt: tgtStr });
      // fallback to source text to avoid runtime errors
      setAt(translatedSubset, pathParts, srcStr);
    }
  });

  if (warnings.length) {
    console.warn(`Warning: ${warnings.length} string(s) had mismatched placeholders and were left in ${fromLang}.`);
  }

  // Merge back into destination
  function deepMerge(a, b) {
    if (typeof b === 'string' || Array.isArray(b)) return b;
    if (!isRecord(b)) return b;
    const out = isRecord(a) ? { ...a } : {};
    for (const [k, v] of Object.entries(b)) {
      out[k] = deepMerge(a?.[k], v);
    }
    return out;
  }

  const updated = deepMerge(dst, translatedSubset);
  await writeJson(dstPath, updated);

  console.log(`Updated ${path.relative(root, dstPath)} with ${pendingCount} translation(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
