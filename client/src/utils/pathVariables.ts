import { v4 as uuidv4 } from 'uuid';
import type { KeyValuePair } from '../types';

export function extractPathVariables(url: string): string[] {
  const matches = url.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const m of matches) {
    const key = m.slice(1);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

export function syncPathVariables(
  url: string,
  existing: KeyValuePair[] | undefined
): KeyValuePair[] | undefined {
  const keys = extractPathVariables(url);
  if (keys.length === 0) return undefined;

  const existingMap = new Map<string, KeyValuePair>();
  if (existing) {
    for (const pv of existing) {
      existingMap.set(pv.key, pv);
    }
  }

  return keys.map(key => {
    const prev = existingMap.get(key);
    if (prev) return prev;
    return {
      id: uuidv4(),
      key,
      value: '',
      enabled: true,
    };
  });
}

export function substitutePathVariables(
  url: string,
  pathVariables: KeyValuePair[] | undefined,
  interpolate: (text: string) => string
): string {
  if (!pathVariables || pathVariables.length === 0) return url;

  let result = url;
  for (const pv of pathVariables) {
    if (pv.enabled && pv.value) {
      const interpolatedValue = interpolate(pv.value);
      result = result.replace(
        new RegExp(`:${pv.key}(?=[^a-zA-Z0-9_]|$)`, 'g'),
        interpolatedValue
      );
    }
  }
  return result;
}
