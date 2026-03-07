import type { ApiResponse, ResponseExtraction } from '../types';

function evaluateJsonPath(obj: any, path: string): string {
  try {
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return '';
      current = current[part];
    }
    if (typeof current === 'object') return JSON.stringify(current);
    return String(current ?? '');
  } catch {
    return '';
  }
}

export function runExtractions(
  response: ApiResponse,
  extractions: ResponseExtraction[]
): Array<{ variableName: string; value: string }> {
  const results: Array<{ variableName: string; value: string }> = [];

  extractions
    .filter(e => e.enabled)
    .forEach(extraction => {
      try {
        let value = '';

        switch (extraction.source) {
          case 'json-path': {
            const parsed = JSON.parse(response.body);
            value = evaluateJsonPath(parsed, extraction.expression);
            break;
          }

          case 'regex': {
            const match = response.body.match(new RegExp(extraction.expression));
            value = match ? (match[1] || match[0]) : '';
            break;
          }

          case 'header': {
            const headerKey = extraction.expression.toLowerCase();
            const entry = Object.entries(response.headers).find(
              ([k]) => k.toLowerCase() === headerKey
            );
            value = entry ? entry[1] : '';
            break;
          }
        }

        if (value && extraction.variableName) {
          results.push({ variableName: extraction.variableName, value });
        }
      } catch {}
    });

  return results;
}
