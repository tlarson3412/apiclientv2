import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import {
  Play, Square, Upload, Download, Check, X, Loader2,
  BarChart3, Clock, Zap, AlertTriangle, FileJson, FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDataFile, type ParsedDataFile } from '@/utils/loadTestParser';
import {
  runLoadTest,
  calculateStats,
  exportLoadTestResultsAsJSON,
  exportLoadTestResultsAsCSV,
} from '@/utils/loadTestRunner';
import type { LoadTestConfig, LoadTestIterationResult, LoadTestRunStats } from '@/types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
};

interface LoadTestRunnerProps {
  requestId?: string;
  open: boolean;
  onClose: () => void;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type RunPhase = 'setup' | 'running' | 'complete' | 'stopped';

export function LoadTestRunner({ requestId, open, onClose }: LoadTestRunnerProps) {
  const requests = useStore(s => s.requests);
  const interpolate = useStore(s => s.interpolateVariables);

  const [selectedRequestId, setSelectedRequestId] = useState(requestId || '');
  const [dataFile, setDataFile] = useState<ParsedDataFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [config, setConfig] = useState<LoadTestConfig>({
    concurrency: 1,
    delayMs: 0,
    stopOnErrorThreshold: 0,
    retryCount: 0,
  });

  const [phase, setPhase] = useState<RunPhase>('setup');
  const [results, setResults] = useState<LoadTestIterationResult[]>([]);
  const [stats, setStats] = useState<LoadTestRunStats | null>(null);
  const stopRef = useRef(false);
  const [activeResultsTab, setActiveResultsTab] = useState<'metrics' | 'iterations'>('metrics');

  const selectedRequest = requests.find(r => r.id === selectedRequestId);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = parseDataFile(content, file.name);
        setDataFile(parsed);
        setFileName(file.name);
      } catch {
        setDataFile(null);
        setFileName('');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedRequest || !dataFile || dataFile.rows.length === 0) return;

    setPhase('running');
    setResults([]);
    setStats(null);
    stopRef.current = false;

    const boundInterpolate = (text: string) => interpolate(text, selectedRequest.collectionId);
    const { results: finalResults, elapsedMs } = await runLoadTest(
      selectedRequest,
      dataFile.rows,
      boundInterpolate,
      config,
      {
        onIterationComplete: (result) => {
          setResults(prev => [...prev, result]);
        },
        onStatsUpdate: (newStats) => {
          setStats(newStats);
        },
        shouldStop: () => stopRef.current,
      }
    );

    setStats(calculateStats(finalResults, elapsedMs));
    setPhase(stopRef.current ? 'stopped' : 'complete');
  }, [selectedRequest, dataFile, interpolate, config]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const handleReset = useCallback(() => {
    setPhase('setup');
    setResults([]);
    setStats(null);
  }, []);

  const canRun = selectedRequest && dataFile && dataFile.rows.length > 0;

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Load Test Runner</ModalTitle>
          <ModalDescription>
            Import a CSV or JSON file and iterate through each row as request data
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4 overflow-auto flex-1 py-2">
          {phase === 'setup' && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-label-muted font-medium">Request</label>
                  <select
                    value={selectedRequestId}
                    onChange={(e) => setSelectedRequestId(e.target.value)}
                    className="h-8 px-2 text-[13px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued"
                  >
                    <option value="">Select a request...</option>
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.method} {r.name || r.url || 'Untitled'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRequest && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-utility-muted">
                    <span className={cn('text-[11px] font-mono font-semibold', METHOD_COLORS[selectedRequest.method] || 'text-label-muted')}>
                      {selectedRequest.method}
                    </span>
                    <span className="text-[12px] text-label-mid font-mono truncate">{selectedRequest.url || 'No URL'}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-label-muted font-medium">Data File (CSV or JSON)</label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-utility-subdued rounded text-label-vivid hover:bg-utility-muted transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {fileName || 'Choose file...'}
                      </span>
                    </label>
                    {dataFile && (
                      <span className="text-[12px] text-label-muted">
                        {dataFile.rows.length} row{dataFile.rows.length !== 1 ? 's' : ''} · {dataFile.columns.length} column{dataFile.columns.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {dataFile && dataFile.columns.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] text-label-muted font-medium">Data Preview (first 5 rows)</label>
                    <div className="overflow-x-auto border border-utility-subdued rounded">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="bg-utility-muted">
                            <th className="px-2 py-1 text-left text-label-muted font-medium border-b border-utility-subdued">#</th>
                            {dataFile.columns.map(col => (
                              <th key={col} className="px-2 py-1 text-left text-label-muted font-medium border-b border-utility-subdued">
                                {'{{' + col + '}}'}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataFile.rows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-b border-utility-subdued last:border-0">
                              <td className="px-2 py-1 text-label-muted">{idx + 1}</td>
                              {dataFile.columns.map(col => (
                                <td key={col} className="px-2 py-1 text-label-mid max-w-[150px] truncate">{row[col]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {dataFile.rows.length > 5 && (
                      <span className="text-[11px] text-label-muted">...and {dataFile.rows.length - 5} more rows</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-utility-subdued pt-3">
                <Typography variant="body-small" className="text-label-vivid font-medium">Run Configuration</Typography>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-label-muted">Concurrency</label>
                    <input
                      type="number"
                      value={config.concurrency}
                      onChange={(e) => setConfig(c => ({ ...c, concurrency: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) }))}
                      min={1}
                      max={50}
                      className="h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-label-muted">Delay (ms)</label>
                    <input
                      type="number"
                      value={config.delayMs}
                      onChange={(e) => setConfig(c => ({ ...c, delayMs: Math.max(0, parseInt(e.target.value) || 0) }))}
                      min={0}
                      step={100}
                      className="h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-label-muted">Stop after errors</label>
                    <input
                      type="number"
                      value={config.stopOnErrorThreshold}
                      onChange={(e) => setConfig(c => ({ ...c, stopOnErrorThreshold: Math.max(0, parseInt(e.target.value) || 0) }))}
                      min={0}
                      placeholder="0 = never"
                      className="h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-label-muted">Retries</label>
                    <input
                      type="number"
                      value={config.retryCount}
                      onChange={(e) => setConfig(c => ({ ...c, retryCount: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)) }))}
                      min={0}
                      max={5}
                      className="h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleRun}
                  disabled={!canRun}
                >
                  <Play className="w-4 h-4" /> Start Load Test
                </Button>
              </div>
            </>
          )}

          {phase === 'running' && stats && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 rounded bg-utility-muted">
                <Loader2 className="w-4 h-4 animate-spin text-standard-subdued" />
                <Typography variant="body-small" className="text-label-mid">
                  Running... {results.length}/{dataFile?.rows.length || 0}
                </Typography>
                <div className="flex-1 h-2 rounded-full bg-surface-alternate-muted overflow-hidden">
                  <div
                    className="h-full bg-standard-subdued rounded-full transition-all"
                    style={{ width: `${dataFile && dataFile.rows.length > 0 ? (results.length / dataFile.rows.length) * 100 : 0}%` }}
                  />
                </div>
                <Button variant="destructive" size="small" onClick={handleStop}>
                  <Square className="w-3.5 h-3.5" /> Stop
                </Button>
              </div>

              <MetricsGrid stats={stats} />

              <LiveIterationsList results={results} columns={dataFile?.columns || []} />
            </div>
          )}

          {(phase === 'complete' || phase === 'stopped') && stats && (
            <div className="flex flex-col gap-4">
              <div className={cn(
                'flex items-center gap-3 p-3 rounded',
                phase === 'stopped'
                  ? 'bg-status-caution-muted'
                  : stats.failedIterations === 0
                  ? 'bg-status-success-muted'
                  : 'bg-status-danger-muted'
              )}>
                {phase === 'stopped' ? (
                  <AlertTriangle className="w-5 h-5 text-status-caution-mid" />
                ) : stats.failedIterations === 0 ? (
                  <Check className="w-5 h-5 text-status-success-mid" />
                ) : (
                  <X className="w-5 h-5 text-status-danger-mid" />
                )}
                <div className="flex-1">
                  <Typography variant="body-small" className={
                    phase === 'stopped'
                      ? 'text-status-caution-mid'
                      : stats.failedIterations === 0
                      ? 'text-status-success-mid'
                      : 'text-status-danger-mid'
                  }>
                    {phase === 'stopped'
                      ? 'Test stopped'
                      : stats.failedIterations === 0
                      ? 'All iterations passed'
                      : `${stats.failedIterations} iteration${stats.failedIterations > 1 ? 's' : ''} failed`}
                  </Typography>
                  <Typography variant="caption" className="text-label-muted">
                    {stats.completedIterations}/{stats.totalIterations} completed · {stats.avgTime}ms avg · {stats.throughput} req/s
                  </Typography>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      const json = exportLoadTestResultsAsJSON(results, stats);
                      downloadFile(json, 'load-test-results.json', 'application/json');
                    }}
                  >
                    <FileJson className="w-3.5 h-3.5" /> JSON
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      const csv = exportLoadTestResultsAsCSV(results, dataFile?.columns || []);
                      downloadFile(csv, 'load-test-results.csv', 'text/csv');
                    }}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                  </Button>
                  <Button variant="text" size="small" onClick={handleReset}>
                    <Play className="w-3.5 h-3.5" /> New Run
                  </Button>
                </div>
              </div>

              <div className="flex gap-1 border-b border-utility-subdued">
                <button
                  onClick={() => setActiveResultsTab('metrics')}
                  className={cn(
                    'px-3 py-1.5 text-[12px] font-medium border-b-2 transition-colors',
                    activeResultsTab === 'metrics'
                      ? 'border-standard-subdued text-label-vivid'
                      : 'border-transparent text-label-muted hover:text-label-mid'
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
                  Metrics
                </button>
                <button
                  onClick={() => setActiveResultsTab('iterations')}
                  className={cn(
                    'px-3 py-1.5 text-[12px] font-medium border-b-2 transition-colors',
                    activeResultsTab === 'iterations'
                      ? 'border-standard-subdued text-label-vivid'
                      : 'border-transparent text-label-muted hover:text-label-mid'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Iterations ({results.length})
                </button>
              </div>

              {activeResultsTab === 'metrics' && (
                <div className="flex flex-col gap-4">
                  <MetricsGrid stats={stats} />
                  <StatusDistribution stats={stats} />
                </div>
              )}

              {activeResultsTab === 'iterations' && (
                <IterationsTable results={results} columns={dataFile?.columns || []} />
              )}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

function MetricsGrid({ stats }: { stats: LoadTestRunStats }) {
  const metrics = [
    { label: 'Avg', value: `${stats.avgTime}ms`, icon: Clock },
    { label: 'Min', value: `${stats.minTime}ms`, icon: Zap },
    { label: 'Max', value: `${stats.maxTime}ms`, icon: Zap },
    { label: 'P95', value: `${stats.p95Time}ms`, icon: BarChart3 },
    { label: 'P99', value: `${stats.p99Time}ms`, icon: BarChart3 },
    { label: 'Throughput', value: `${stats.throughput}/s`, icon: Zap },
    { label: 'Error Rate', value: `${stats.errorRate.toFixed(1)}%`, icon: AlertTriangle },
    { label: 'Total', value: `${(stats.totalTime / 1000).toFixed(1)}s`, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {metrics.map(m => (
        <div key={m.label} className="flex flex-col gap-0.5 p-2 rounded bg-utility-muted">
          <span className="text-[10px] text-label-muted uppercase tracking-wider">{m.label}</span>
          <span className="text-[14px] font-mono font-semibold text-label-vivid">{m.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusDistribution({ stats }: { stats: LoadTestRunStats }) {
  const entries = Object.entries(stats.statusDistribution).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (entries.length === 0) return null;

  const maxCount = Math.max(...entries.map(([, count]) => count));

  return (
    <div className="flex flex-col gap-2">
      <Typography variant="body-small" className="text-label-vivid font-medium">Status Code Distribution</Typography>
      <div className="flex flex-col gap-1.5">
        {entries.map(([code, count]) => {
          const numCode = Number(code);
          const colorClass = numCode === 0
            ? 'bg-status-danger-mid'
            : numCode >= 200 && numCode < 300
            ? 'bg-status-success-mid'
            : numCode >= 400
            ? 'bg-status-danger-mid'
            : 'bg-status-caution-mid';

          return (
            <div key={code} className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-label-mid w-10">{numCode === 0 ? 'ERR' : code}</span>
              <div className="flex-1 h-4 bg-surface-alternate-muted rounded overflow-hidden">
                <div
                  className={cn('h-full rounded transition-all', colorClass)}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-mono text-label-muted w-10 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveIterationsList({ results, columns }: { results: LoadTestIterationResult[]; columns: string[] }) {
  const latest = results.slice(-10).reverse();
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="body-small" className="text-label-muted">Latest iterations</Typography>
      {latest.map(r => (
        <div key={r.iteration} className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-label-muted w-6 text-right">#{r.iteration}</span>
          {r.passed ? (
            <Check className="w-3 h-3 text-status-success-mid shrink-0" />
          ) : (
            <X className="w-3 h-3 text-status-danger-mid shrink-0" />
          )}
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px]',
            r.status >= 200 && r.status < 300
              ? 'bg-status-success-muted text-status-success-mid'
              : 'bg-status-danger-muted text-status-danger-mid'
          )}>
            {r.status || 'ERR'}
          </span>
          <span className="text-label-muted">{r.time}ms</span>
          <span className="text-label-muted truncate flex-1">
            {columns.slice(0, 3).map(c => `${c}=${r.rowData[c] || ''}`).join(' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

function IterationsTable({ results, columns }: { results: LoadTestIterationResult[]; columns: string[] }) {
  return (
    <div className="overflow-x-auto border border-utility-subdued rounded max-h-[300px] overflow-y-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="sticky top-0 bg-utility-muted z-10">
          <tr>
            <th className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">#</th>
            {columns.map(col => (
              <th key={col} className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">{col}</th>
            ))}
            <th className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">Status</th>
            <th className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">Time</th>
            <th className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">Pass</th>
            <th className="px-2 py-1.5 text-left text-label-muted font-medium border-b border-utility-subdued">Error</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.iteration} className="border-b border-utility-subdued last:border-0 hover:bg-surface-alternate-muted">
              <td className="px-2 py-1 text-label-muted">{r.iteration}</td>
              {columns.map(col => (
                <td key={col} className="px-2 py-1 text-label-mid max-w-[120px] truncate">{r.rowData[col] || ''}</td>
              ))}
              <td className="px-2 py-1">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px]',
                  r.status >= 200 && r.status < 300
                    ? 'bg-status-success-muted text-status-success-mid'
                    : r.status >= 400 || r.status === 0
                    ? 'bg-status-danger-muted text-status-danger-mid'
                    : 'bg-status-caution-muted text-status-caution-mid'
                )}>
                  {r.status || 'ERR'}
                </span>
              </td>
              <td className="px-2 py-1 text-label-muted">{r.time}ms</td>
              <td className="px-2 py-1">
                {r.passed ? (
                  <Check className="w-3 h-3 text-status-success-mid" />
                ) : (
                  <X className="w-3 h-3 text-status-danger-mid" />
                )}
              </td>
              <td className="px-2 py-1 text-status-danger-mid max-w-[150px] truncate">{r.error || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
