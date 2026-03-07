import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Typography } from '@/components/ui/typography';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { AssertionType, TestAssertion } from '@/types';

const ASSERTION_TYPES: { value: AssertionType; label: string; hasProperty: boolean }[] = [
  { value: 'status', label: 'Status Code', hasProperty: false },
  { value: 'body-contains', label: 'Body Contains', hasProperty: false },
  { value: 'body-not-contains', label: 'Body Not Contains', hasProperty: false },
  { value: 'json-path', label: 'JSON Path Value', hasProperty: true },
  { value: 'response-time', label: 'Response Time (ms)', hasProperty: false },
  { value: 'header-exists', label: 'Header Exists', hasProperty: true },
  { value: 'header-equals', label: 'Header Equals', hasProperty: true },
];

export function AssertionEditor() {
  const activeRequest = useStore(s => {
    const tab = s.tabs.find(t => t.id === s.activeTabId);
    return tab ? s.requests.find(r => r.id === tab.requestId) : undefined;
  });
  const addAssertion = useStore(s => s.addAssertion);
  const updateAssertion = useStore(s => s.updateAssertion);
  const deleteAssertion = useStore(s => s.deleteAssertion);
  const response = useStore(s => activeRequest ? s.responses[activeRequest.id] : undefined);

  if (!activeRequest) return null;

  const assertions = activeRequest.assertions || [];
  const testResults = response?.testResults || [];

  const handleAdd = () => {
    const assertion: TestAssertion = {
      id: uuidv4(),
      type: 'status',
      expected: '200',
      enabled: true,
    };
    addAssertion(activeRequest.id, assertion);
  };

  const getResult = (assertionId: string) => {
    return testResults.find(r => r.assertionId === assertionId);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Test Assertions</Typography>
        <Button variant="text" size="small" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {assertions.length === 0 && (
        <Typography variant="caption" className="text-label-muted py-2">
          No assertions defined. Add assertions to automatically validate responses.
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        {assertions.map(assertion => {
          const typeConfig = ASSERTION_TYPES.find(t => t.value === assertion.type);
          const result = getResult(assertion.id);

          return (
            <div key={assertion.id} className="flex flex-col gap-1.5 p-2.5 rounded border border-utility-subdued bg-surface-alternate-muted">
              <div className="flex items-center gap-2">
                <button
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    assertion.enabled
                      ? 'bg-standard-subdued border-standard-subdued'
                      : 'border-utility-mid bg-transparent'
                  )}
                  onClick={() => updateAssertion(activeRequest.id, assertion.id, { enabled: !assertion.enabled })}
                >
                  {assertion.enabled && <Check className="w-3 h-3 text-white" />}
                </button>

                <select
                  className="bg-transparent text-[13px] text-label-vivid border border-utility-subdued rounded px-2 py-1 flex-1"
                  value={assertion.type}
                  onChange={e => updateAssertion(activeRequest.id, assertion.id, { type: e.target.value as AssertionType })}
                >
                  {ASSERTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {result && (
                  <span className={cn(
                    'flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded',
                    result.passed
                      ? 'bg-status-success-muted text-status-success-mid'
                      : 'bg-status-danger-muted text-status-danger-mid'
                  )}>
                    {result.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {result.passed ? 'Pass' : 'Fail'}
                  </span>
                )}

                <button
                  className="p-0.5 rounded hover:bg-status-danger-muted transition-colors"
                  onClick={() => deleteAssertion(activeRequest.id, assertion.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
                </button>
              </div>

              <div className="flex gap-2">
                {typeConfig?.hasProperty && (
                  <TextInput
                    label={assertion.type === 'json-path' ? 'Path (e.g. $.data.id)' : 'Header name'}
                    value={assertion.property || ''}
                    onValueChange={v => updateAssertion(activeRequest.id, assertion.id, { property: v })}
                    className="flex-1"
                  />
                )}
                <TextInput
                  label={assertion.type === 'response-time' ? 'Max ms' : 'Expected value'}
                  value={assertion.expected}
                  onValueChange={v => updateAssertion(activeRequest.id, assertion.id, { expected: v })}
                  className="flex-1"
                />
              </div>

              {result && !result.passed && (
                <Typography variant="caption" className="text-status-danger-mid">
                  {result.message}
                </Typography>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
