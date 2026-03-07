import type { ApiRequest, ApiResponse, CollectionTestResult } from '../types';
import { executeRequest } from './httpClient';
import { runAssertions } from './testRunner';
import { runExtractions } from './extractionRunner';

export interface RunnerOptions {
  delayMs?: number;
  retryCount?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runCollectionTests(
  requests: ApiRequest[],
  interpolate: (text: string) => string,
  setExtractedVariable: (key: string, value: string) => void,
  onProgress?: (completed: number, total: number, result: CollectionTestResult) => void,
  options?: RunnerOptions
): Promise<CollectionTestResult[]> {
  const results: CollectionTestResult[] = [];
  const delayMs = options?.delayMs || 0;
  const retryCount = options?.retryCount || 0;

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    let lastResult: CollectionTestResult | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const response = await executeRequest(request, interpolate);

        const assertions = request.assertions || [];
        const structuredResults = assertions.length > 0 ? runAssertions(response, assertions) : [];

        const scriptTestResults = response.testResults || [];

        const testResults = [...structuredResults, ...scriptTestResults];

        const extractions = request.extractions || [];
        if (extractions.length > 0) {
          const extractedVars = runExtractions(response, extractions);
          extractedVars.forEach(({ variableName, value }) => {
            setExtractedVariable(variableName, value);
          });
        }

        const allPassed = testResults.length === 0 || testResults.every(r => r.passed);

        lastResult = {
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.url,
          status: response.status,
          time: response.time,
          assertions: testResults,
          passed: allPassed,
        };

        if (allPassed || attempt === retryCount) break;
      } catch (err: any) {
        lastResult = {
          requestId: request.id,
          requestName: request.name,
          method: request.method,
          url: request.url,
          status: 0,
          time: 0,
          assertions: [],
          passed: false,
          error: err.message || 'Request failed',
        };

        if (attempt === retryCount) break;
      }

      if (attempt < retryCount) {
        await delay(500);
      }
    }

    if (lastResult) {
      results.push(lastResult);
      onProgress?.(i + 1, requests.length, lastResult);
    }

    if (delayMs > 0 && i < requests.length - 1) {
      await delay(delayMs);
    }
  }

  return results;
}

export function exportResultsAsJSON(results: CollectionTestResult[]): string {
  return JSON.stringify(results, null, 2);
}

export function exportResultsAsCSV(results: CollectionTestResult[]): string {
  const headers = ['Request Name', 'Method', 'URL', 'Status', 'Time (ms)', 'Passed', 'Assertions Total', 'Assertions Passed', 'Error'];
  const rows = results.map(r => [
    r.requestName,
    r.method,
    r.url,
    String(r.status),
    String(r.time),
    String(r.passed),
    String(r.assertions.length),
    String(r.assertions.filter(a => a.passed).length),
    r.error || '',
  ]);
  return [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
}
