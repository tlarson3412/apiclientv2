import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/types';

export function TestResultsPanel() {
  const activeRequest = useStore(s => {
    const tab = s.tabs.find(t => t.id === s.activeTabId);
    return tab ? s.requests.find(r => r.id === tab.requestId) : undefined;
  });
  const response = useStore(s => activeRequest ? s.responses[activeRequest.id] : undefined);

  if (!activeRequest) return null;

  const assertions = activeRequest.assertions || [];
  const testResults = response?.testResults || [];

  if (assertions.length === 0 && testResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <AlertTriangle className="w-8 h-8 text-utility-mid" />
        <Typography variant="body-small" className="text-label-muted text-center">
          No test assertions defined for this request.
        </Typography>
        <Typography variant="caption" className="text-label-muted text-center">
          Add assertions in the Tests tab of the request builder above, or use pm.test() in your scripts.
        </Typography>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Typography variant="body-small" className="text-label-muted text-center">
          Send the request to run test assertions
        </Typography>
      </div>
    );
  }

  const passCount = testResults.filter(r => r.passed).length;
  const failCount = testResults.filter(r => !r.passed).length;
  const allPassed = failCount === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(
        'flex items-center gap-3 p-3 rounded',
        allPassed ? 'bg-status-success-muted' : 'bg-status-danger-muted'
      )}>
        {allPassed ? (
          <Check className="w-5 h-5 text-status-success-mid" />
        ) : (
          <X className="w-5 h-5 text-status-danger-mid" />
        )}
        <Typography variant="body-small" className={allPassed ? 'text-status-success-mid' : 'text-status-danger-mid'}>
          {allPassed ? 'All tests passed' : `${failCount} of ${testResults.length} tests failed`}
        </Typography>
        <div className="flex-1" />
        <span className="text-[12px] font-mono text-status-success-mid">{passCount} passed</span>
        {failCount > 0 && (
          <span className="text-[12px] font-mono text-status-danger-mid">{failCount} failed</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {testResults.map((result, idx) => {
          const assertion = assertions.find(a => a.id === result.assertionId);
          const isScriptTest = result.assertionId?.startsWith('pm-test-');
          return (
            <ResultRow key={idx} result={result} assertionLabel={assertion?.type || (isScriptTest ? 'script' : 'unknown')} />
          );
        })}
      </div>
    </div>
  );
}

function ResultRow({ result, assertionLabel }: { result: TestResult; assertionLabel: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded border transition-colors',
      result.passed
        ? 'border-status-success-muted bg-transparent'
        : 'border-status-danger-muted bg-transparent'
    )}>
      {result.passed ? (
        <Check className="w-4 h-4 text-status-success-mid shrink-0" />
      ) : (
        <X className="w-4 h-4 text-status-danger-mid shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <Typography variant="body-small" className="text-label-vivid">
          {result.message}
        </Typography>
        {result.actual && !result.passed && (
          <Typography variant="caption" className="text-label-muted">
            Actual: {result.actual}
          </Typography>
        )}
      </div>
      <span className="text-[11px] font-mono text-label-muted shrink-0 uppercase">
        {assertionLabel.replace(/-/g, ' ')}
      </span>
    </div>
  );
}
