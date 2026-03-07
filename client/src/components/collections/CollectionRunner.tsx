import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Play, Check, X, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runCollectionTests, exportResultsAsJSON, exportResultsAsCSV } from '@/utils/collectionRunner';
import type { CollectionTestResult } from '@/types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
};

interface CollectionRunnerProps {
  collectionId: string;
  collectionName: string;
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

export function CollectionRunner({ collectionId, collectionName, open, onClose }: CollectionRunnerProps) {
  const allRequests = useStore(s => s.requests);
  const requests = useMemo(() => allRequests.filter(r => r.collectionId === collectionId), [allRequests, collectionId]);
  const interpolate = useStore(s => s.interpolateVariables);
  const setExtractedVariable = useStore(s => s.setExtractedVariable);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CollectionTestResult[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [delayMs, setDelayMs] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const handleRun = async () => {
    if (requests.length === 0) return;
    setRunning(true);
    setResults([]);
    setProgress({ completed: 0, total: requests.length });

    const boundInterpolate = (text: string) => interpolate(text, collectionId);
    const finalResults = await runCollectionTests(
      requests,
      boundInterpolate,
      setExtractedVariable,
      (completed, total, result) => {
        setProgress({ completed, total });
        setResults(prev => [...prev, result]);
      },
      { delayMs, retryCount }
    );

    setResults(finalResults);
    setRunning(false);
  };

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0);
  const passedAssertions = results.reduce((sum, r) => sum + r.assertions.filter(a => a.passed).length, 0);
  const totalTime = results.reduce((sum, r) => sum + r.time, 0);

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Run Collection: {collectionName}</ModalTitle>
          <ModalDescription>
            {requests.length} request{requests.length !== 1 ? 's' : ''} in this collection
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4 overflow-auto flex-1 py-2">
          {!running && results.length === 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-label-muted">Delay (ms):</label>
                  <input
                    type="number"
                    value={delayMs}
                    onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    step={100}
                    className="w-20 h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-label-muted">Retries:</label>
                  <input
                    type="number"
                    value={retryCount}
                    onChange={(e) => setRetryCount(Math.max(0, Math.min(5, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={5}
                    className="w-16 h-7 px-2 text-[12px] bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center py-4 gap-3">
                <Typography variant="body-small" className="text-label-muted text-center">
                  Run all requests in this collection sequentially and see test results.
                </Typography>
                <Button variant="primary" size="small" onClick={handleRun} disabled={requests.length === 0}>
                  <Play className="w-4 h-4" /> Run All
                </Button>
              </div>
            </div>
          )}

          {running && (
            <div className="flex items-center gap-3 p-3 rounded bg-utility-muted">
              <Loader2 className="w-4 h-4 animate-spin text-standard-subdued" />
              <Typography variant="body-small" className="text-label-mid">
                Running... {progress.completed}/{progress.total}
              </Typography>
              <div className="flex-1 h-2 rounded-full bg-surface-alternate-muted overflow-hidden">
                <div
                  className="h-full bg-standard-subdued rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && !running && (
            <div className={cn(
              'flex items-center gap-3 p-3 rounded',
              failCount === 0 ? 'bg-status-success-muted' : 'bg-status-danger-muted'
            )}>
              {failCount === 0 ? (
                <Check className="w-5 h-5 text-status-success-mid" />
              ) : (
                <X className="w-5 h-5 text-status-danger-mid" />
              )}
              <div className="flex-1">
                <Typography variant="body-small" className={failCount === 0 ? 'text-status-success-mid' : 'text-status-danger-mid'}>
                  {failCount === 0 ? 'All requests passed' : `${failCount} request${failCount > 1 ? 's' : ''} failed`}
                </Typography>
                <Typography variant="caption" className="text-label-muted">
                  {passCount}/{results.length} requests passed · {passedAssertions}/{totalAssertions} assertions · {totalTime}ms total
                </Typography>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="text" size="small" onClick={() => downloadFile(exportResultsAsJSON(results), `${collectionName}-results.json`, 'application/json')}>
                  <Download className="w-3.5 h-3.5" /> JSON
                </Button>
                <Button variant="text" size="small" onClick={() => downloadFile(exportResultsAsCSV(results), `${collectionName}-results.csv`, 'text/csv')}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button variant="text" size="small" onClick={handleRun}>
                  <Play className="w-3.5 h-3.5" /> Re-run
                </Button>
              </div>
            </div>
          )}

          {results.map((result, idx) => (
            <div key={idx} className={cn(
              'flex flex-col gap-1.5 p-3 rounded border',
              result.passed ? 'border-status-success-muted' : 'border-status-danger-muted'
            )}>
              <div className="flex items-center gap-2">
                {result.passed ? (
                  <Check className="w-4 h-4 text-status-success-mid shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-status-danger-mid shrink-0" />
                )}
                <span className={cn('text-[11px] font-mono font-semibold w-12', METHOD_COLORS[result.method] || 'text-label-muted')}>
                  {result.method}
                </span>
                <Typography variant="body-small" className="text-label-vivid flex-1 truncate">
                  {result.requestName}
                </Typography>
                <span className={cn(
                  'text-[12px] font-mono px-2 py-0.5 rounded',
                  result.status >= 200 && result.status < 300
                    ? 'bg-status-success-muted text-status-success-mid'
                    : result.status >= 400
                    ? 'bg-status-danger-muted text-status-danger-mid'
                    : 'bg-utility-muted text-label-muted'
                )}>
                  {result.status || 'ERR'}
                </span>
                <span className="text-[12px] font-mono text-label-muted">{result.time}ms</span>
              </div>

              {result.error && (
                <Typography variant="caption" className="text-status-danger-mid pl-6">
                  {result.error}
                </Typography>
              )}

              {result.assertions.length > 0 && (
                <div className="pl-6 flex flex-col gap-0.5 mt-1">
                  {result.assertions.map((assertion, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2 text-[12px]">
                      {assertion.passed ? (
                        <Check className="w-3 h-3 text-status-success-mid" />
                      ) : (
                        <X className="w-3 h-3 text-status-danger-mid" />
                      )}
                      <span className={assertion.passed ? 'text-label-mid' : 'text-status-danger-mid'}>
                        {assertion.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
