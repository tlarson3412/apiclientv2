import type { ApiRequest, ApiResponse, LoadTestConfig, LoadTestIterationResult, LoadTestRunStats } from '../types';
import { executeRequest } from './httpClient';
import { runAssertions } from './testRunner';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createRowInterpolator(
  rowData: Record<string, string>,
  baseInterpolate: (text: string) => string
): (text: string) => string {
  return (text: string) => {
    let result = baseInterpolate(text);
    Object.entries(rowData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  };
}

function percentile(sortedTimes: number[], p: number): number {
  if (sortedTimes.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, idx)];
}

export function calculateStats(results: LoadTestIterationResult[], elapsedMs: number): LoadTestRunStats {
  const times = results.map(r => r.time).sort((a, b) => a - b);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const statusDist: Record<number, number> = {};
  results.forEach(r => {
    statusDist[r.status] = (statusDist[r.status] || 0) + 1;
  });

  const totalResponseTime = times.reduce((s, t) => s + t, 0);

  return {
    totalIterations: results.length,
    completedIterations: results.length,
    passedIterations: passed,
    failedIterations: failed,
    errorRate: results.length > 0 ? (failed / results.length) * 100 : 0,
    minTime: times[0] || 0,
    maxTime: times[times.length - 1] || 0,
    avgTime: results.length > 0 ? Math.round(totalResponseTime / results.length) : 0,
    p95Time: percentile(times, 95),
    p99Time: percentile(times, 99),
    throughput: elapsedMs > 0 ? Math.round((results.length / (elapsedMs / 1000)) * 100) / 100 : 0,
    totalTime: Math.round(elapsedMs),
    statusDistribution: statusDist,
  };
}

export interface LoadTestCallbacks {
  onIterationComplete: (result: LoadTestIterationResult) => void;
  onStatsUpdate: (stats: LoadTestRunStats) => void;
  shouldStop: () => boolean;
}

export async function runLoadTest(
  request: ApiRequest,
  dataRows: Record<string, string>[],
  baseInterpolate: (text: string) => string,
  config: LoadTestConfig,
  callbacks: LoadTestCallbacks
): Promise<{ results: LoadTestIterationResult[]; elapsedMs: number }> {
  const results: LoadTestIterationResult[] = [];
  const startTime = performance.now();
  let errorCount = 0;
  const { concurrency, delayMs, stopOnErrorThreshold, retryCount } = config;

  const queue = dataRows.map((row, idx) => ({ row, iteration: idx + 1 }));
  let queueIndex = 0;
  let iterationCounter = 0;

  async function processIteration(row: Record<string, string>, iteration: number): Promise<LoadTestIterationResult> {
    const interpolate = createRowInterpolator(row, baseInterpolate);
    let lastResult: LoadTestIterationResult | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const response: ApiResponse = await executeRequest(request, interpolate);
        const assertions = request.assertions || [];
        const testResults = assertions.length > 0 ? runAssertions(response, assertions) : [];
        const allPassed = testResults.length === 0 || testResults.every(r => r.passed);

        lastResult = {
          iteration,
          rowData: row,
          status: response.status,
          statusText: response.statusText,
          time: response.time,
          size: response.size,
          assertions: testResults,
          passed: allPassed,
          resolvedUrl: interpolate(request.url),
        };

        if (allPassed || attempt === retryCount) break;
      } catch (err: any) {
        lastResult = {
          iteration,
          rowData: row,
          status: 0,
          statusText: 'Error',
          time: 0,
          size: 0,
          assertions: [],
          passed: false,
          error: err.message || 'Request failed',
          resolvedUrl: interpolate(request.url),
        };

        if (attempt === retryCount) break;
      }

      if (attempt < retryCount) {
        await delay(500);
      }
    }

    return lastResult!;
  }

  async function worker(): Promise<void> {
    while (queueIndex < queue.length) {
      if (callbacks.shouldStop()) return;
      if (stopOnErrorThreshold > 0 && errorCount >= stopOnErrorThreshold) return;

      const idx = queueIndex++;
      const item = queue[idx];
      if (!item) return;

      const myIteration = iterationCounter++;
      if (delayMs > 0 && myIteration > 0) {
        await delay(delayMs);
      }

      const result = await processIteration(item.row, item.iteration);
      results.push(result);

      if (!result.passed) {
        errorCount++;
      }

      callbacks.onIterationComplete(result);
      const elapsed = performance.now() - startTime;
      callbacks.onStatsUpdate(calculateStats(results, elapsed));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);

  const elapsedMs = performance.now() - startTime;
  return { results, elapsedMs };
}

export function exportLoadTestResultsAsJSON(
  results: LoadTestIterationResult[],
  stats: LoadTestRunStats
): string {
  return JSON.stringify({ stats, results }, null, 2);
}

export function exportLoadTestResultsAsCSV(
  results: LoadTestIterationResult[],
  dataColumns: string[]
): string {
  const headers = [
    'Iteration',
    ...dataColumns,
    'Resolved URL',
    'Status',
    'Time (ms)',
    'Size (bytes)',
    'Passed',
    'Assertions Total',
    'Assertions Passed',
    'Error',
  ];

  const rows = results.map(r => [
    String(r.iteration),
    ...dataColumns.map(col => r.rowData[col] || ''),
    r.resolvedUrl,
    String(r.status),
    String(r.time),
    String(r.size),
    String(r.passed),
    String(r.assertions.length),
    String(r.assertions.filter(a => a.passed).length),
    r.error || '',
  ]);

  return [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
