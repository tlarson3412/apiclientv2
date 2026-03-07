import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useFlowStore, type FlowStep } from '@/store/useFlowStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import {
  Plus, Trash2, Play, ArrowDown, Check, X, Loader2, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { executeRequest } from '@/utils/httpClient';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
};

const METHOD_BG: Record<string, string> = {
  GET: 'bg-status-success-mid/10',
  POST: 'bg-standard-subdued/10',
  PUT: 'bg-status-caution-mid/10',
  DELETE: 'bg-status-danger-mid/10',
  PATCH: 'bg-status-caution-mid/10',
};

interface StepResult {
  stepId: string;
  status: 'success' | 'failure';
  responseStatus?: number;
  extractedValue?: string;
}

interface FlowBuilderProps {
  open: boolean;
  onClose: () => void;
}

export function FlowBuilder({ open, onClose }: FlowBuilderProps) {
  const allRequests = useStore(s => s.requests);
  const interpolate = useStore(s => s.interpolateVariables);
  const setExtractedVariable = useStore(s => s.setExtractedVariable);

  const flows = useFlowStore(s => s.flows);
  const addFlow = useFlowStore(s => s.addFlow);
  const deleteFlow = useFlowStore(s => s.deleteFlow);
  const addStep = useFlowStore(s => s.addStep);
  const removeStep = useFlowStore(s => s.removeStep);
  const updateStep = useFlowStore(s => s.updateStep);

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [newFlowName, setNewFlowName] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());

  const selectedFlow = flows.find(f => f.id === selectedFlowId);

  const handleAddFlow = () => {
    if (!newFlowName.trim()) return;
    addFlow(newFlowName.trim());
    setNewFlowName('');
  };

  const handleDeleteFlow = (id: string) => {
    if (selectedFlowId === id) setSelectedFlowId(null);
    deleteFlow(id);
  };

  const handleAddStep = (requestId: string) => {
    if (!selectedFlowId) return;
    addStep(selectedFlowId, requestId);
    setShowAddStep(false);
  };

  const getRequestById = (id: string) => allRequests.find(r => r.id === id);

  const extractJsonPath = (body: string, path: string): string => {
    try {
      const obj = JSON.parse(body);
      const parts = path.replace(/^\$\.?/, '').split('.');
      let current: unknown = obj;
      for (const part of parts) {
        if (current === null || current === undefined) return '';
        const arrMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrMatch) {
          current = (current as Record<string, unknown>)[arrMatch[1]];
          if (Array.isArray(current)) current = current[parseInt(arrMatch[2])];
          else return '';
        } else {
          current = (current as Record<string, unknown>)[part];
        }
      }
      return typeof current === 'string' ? current : JSON.stringify(current);
    } catch {
      return '';
    }
  };

  const handleRunFlow = useCallback(async () => {
    if (!selectedFlow || selectedFlow.steps.length === 0) return;
    setRunning(true);
    setStepResults(new Map());

    const variables = new Map<string, string>();
    const sortedSteps = [...selectedFlow.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      const request = getRequestById(step.requestId);
      if (!request) {
        setStepResults(prev => new Map(prev).set(step.id, { stepId: step.id, status: 'failure' }));
        continue;
      }

      let resolvedRequest = { ...request };
      if (step.injectInto && variables.has(step.injectInto)) {
        const varValue = variables.get(step.injectInto)!;
        resolvedRequest = {
          ...resolvedRequest,
          url: resolvedRequest.url.replace(`{{${step.injectInto}}}`, varValue),
          body: resolvedRequest.body.replace(`{{${step.injectInto}}}`, varValue),
          headers: resolvedRequest.headers.map(h => ({
            ...h,
            value: h.value.replace(`{{${step.injectInto}}}`, varValue),
          })),
        };
      }

      try {
        const response = await executeRequest(resolvedRequest, (text) => {
          let result = interpolate(text, request.collectionId);
          variables.forEach((val, key) => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
          });
          return result;
        });

        let extractedValue: string | undefined;
        if (step.extractVariable && step.extractPath) {
          extractedValue = extractJsonPath(response.body, step.extractPath);
          if (extractedValue) {
            variables.set(step.extractVariable, extractedValue);
            setExtractedVariable(step.extractVariable, extractedValue);
          }
        }

        setStepResults(prev => new Map(prev).set(step.id, {
          stepId: step.id,
          status: response.status >= 200 && response.status < 400 ? 'success' : 'failure',
          responseStatus: response.status,
          extractedValue,
        }));
      } catch {
        setStepResults(prev => new Map(prev).set(step.id, { stepId: step.id, status: 'failure' }));
      }
    }

    setRunning(false);
  }, [selectedFlow, allRequests, interpolate, setExtractedVariable]);

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalContent className="max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Request Flow Builder</ModalTitle>
          <ModalDescription>Chain requests together with data extraction</ModalDescription>
        </ModalHeader>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          <div className="w-[220px] flex-shrink-0 border-r border-utility-subdued pr-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="New flow name"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFlow()}
                className="flex-1 px-2 py-1.5 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddFlow}
                className="p-1.5 rounded-md hover:bg-surface-muted text-label-muted hover:text-label-vivid"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {flows.length === 0 && (
              <Typography variant="caption" className="text-label-muted block text-center py-4">
                No flows yet
              </Typography>
            )}

            <div className="space-y-1">
              {flows.map(flow => (
                <div
                  key={flow.id}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm',
                    selectedFlowId === flow.id
                      ? 'bg-surface-muted text-label-vivid'
                      : 'text-label-mid hover:bg-surface-muted'
                  )}
                  onClick={() => setSelectedFlowId(flow.id)}
                >
                  <span className="truncate">{flow.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id); }}
                    className="p-0.5 rounded hover:bg-surface text-label-muted hover:text-status-danger-mid flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedFlow ? (
              <div className="flex items-center justify-center h-full">
                <Typography variant="body-medium" className="text-label-muted">
                  Select or create a flow
                </Typography>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="subheading-large">{selectedFlow.name}</Typography>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleRunFlow}
                    disabled={running || selectedFlow.steps.length === 0}
                  >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {running ? 'Running...' : 'Run Flow'}
                  </Button>
                </div>

                {selectedFlow.steps.length === 0 && (
                  <Typography variant="body-small" className="text-label-muted text-center py-6">
                    Add steps to build your flow pipeline
                  </Typography>
                )}

                {[...selectedFlow.steps].sort((a, b) => a.order - b.order).map((step, idx) => {
                  const request = getRequestById(step.requestId);
                  const result = stepResults.get(step.id);

                  return (
                    <div key={step.id}>
                      <div className="border border-utility-subdued rounded-lg p-3 relative">
                        <div className="flex items-start gap-3">
                          {result && (
                            <div className="flex-shrink-0 mt-0.5">
                              {result.status === 'success' ? (
                                <Check className="w-4 h-4 text-status-success-mid" />
                              ) : (
                                <X className="w-4 h-4 text-status-danger-mid" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {request && (
                                <span className={cn(
                                  'text-xs font-medium px-1.5 py-0.5 rounded',
                                  METHOD_COLORS[request.method],
                                  METHOD_BG[request.method]
                                )}>
                                  {request.method}
                                </span>
                              )}
                              <Typography variant="subheading-small" className="truncate">
                                {request?.name || 'Unknown Request'}
                              </Typography>
                              {result?.responseStatus && (
                                <span className="text-xs text-label-muted">{result.responseStatus}</span>
                              )}
                            </div>
                            {request && (
                              <Typography variant="caption" className="text-label-muted truncate block mt-0.5">
                                {request.url.length > 60 ? request.url.slice(0, 60) + '...' : request.url}
                              </Typography>
                            )}

                            <div className="mt-2 grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[11px] text-label-muted block mb-0.5">Extract as</label>
                                <input
                                  type="text"
                                  placeholder="variableName"
                                  value={step.extractVariable || ''}
                                  onChange={(e) => updateStep(selectedFlow.id, step.id, { extractVariable: e.target.value })}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-label-muted block mb-0.5">JSONPath</label>
                                <input
                                  type="text"
                                  placeholder="$.data.id"
                                  value={step.extractPath || ''}
                                  onChange={(e) => updateStep(selectedFlow.id, step.id, { extractPath: e.target.value })}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-label-muted block mb-0.5">Inject variable</label>
                                <input
                                  type="text"
                                  placeholder="{{varName}}"
                                  value={step.injectInto || ''}
                                  onChange={(e) => updateStep(selectedFlow.id, step.id, { injectInto: e.target.value })}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>

                            {result?.extractedValue && (
                              <Typography variant="caption" className="text-status-success-mid mt-1 block">
                                Extracted: {result.extractedValue.length > 50 ? result.extractedValue.slice(0, 50) + '...' : result.extractedValue}
                              </Typography>
                            )}
                          </div>
                          <button
                            onClick={() => removeStep(selectedFlow.id, step.id)}
                            className="p-1 rounded hover:bg-surface-muted text-label-muted hover:text-status-danger-mid flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {idx < selectedFlow.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-4 h-4 text-label-muted" />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2 relative">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setShowAddStep(!showAddStep)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                    <ChevronDown className="w-3 h-3" />
                  </Button>

                  {showAddStep && (
                    <div className="absolute left-0 top-full mt-1 w-72 bg-surface border border-utility-subdued rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {allRequests.length === 0 ? (
                        <div className="p-3 text-center">
                          <Typography variant="caption" className="text-label-muted">
                            No requests available
                          </Typography>
                        </div>
                      ) : (
                        allRequests.map(req => (
                          <button
                            key={req.id}
                            onClick={() => handleAddStep(req.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-muted text-left"
                          >
                            <span className={cn(
                              'text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0',
                              METHOD_COLORS[req.method],
                              METHOD_BG[req.method]
                            )}>
                              {req.method}
                            </span>
                            <span className="text-sm text-label-vivid truncate">{req.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
