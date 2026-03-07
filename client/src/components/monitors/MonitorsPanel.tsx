import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Plus, Trash2, Play, Pause, Clock, Check, X, Loader2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runCollectionTests } from '@/utils/collectionRunner';

const INTERVAL_OPTIONS = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
];

interface MonitorsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function MonitorsPanel({ open, onClose }: MonitorsPanelProps) {
  const collections = useStore(s => s.collections);
  const requests = useStore(s => s.requests);
  const interpolate = useStore(s => s.interpolateVariables);
  const setExtractedVariable = useStore(s => s.setExtractedVariable);

  const monitors = useMonitorStore(s => s.monitors);
  const addMonitor = useMonitorStore(s => s.addMonitor);
  const updateMonitor = useMonitorStore(s => s.updateMonitor);
  const deleteMonitor = useMonitorStore(s => s.deleteMonitor);
  const toggleMonitor = useMonitorStore(s => s.toggleMonitor);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCollectionId, setFormCollectionId] = useState('');
  const [formInterval, setFormInterval] = useState(5);

  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const runMonitor = useCallback(async (monitorId: string, collectionId: string) => {
    const collectionRequests = requests.filter(r => r.collectionId === collectionId);
    if (collectionRequests.length === 0) return;

    updateMonitor(monitorId, { lastStatus: 'running', lastRun: Date.now() });

    try {
      const results = await runCollectionTests(
        collectionRequests,
        (text: string) => interpolate(text, collectionId),
        setExtractedVariable
      );
      const passed = results.filter(r => r.passed).length;
      const failed = results.length - passed;
      updateMonitor(monitorId, {
        lastStatus: failed > 0 ? 'failure' : 'success',
        lastResults: { total: results.length, passed, failed },
      });
    } catch {
      updateMonitor(monitorId, { lastStatus: 'failure' });
    }
  }, [requests, interpolate, setExtractedVariable, updateMonitor]);

  useEffect(() => {
    const currentIntervals = intervalsRef.current;
    monitors.forEach(monitor => {
      if (monitor.enabled && !currentIntervals.has(monitor.id)) {
        const id = setInterval(() => {
          runMonitor(monitor.id, monitor.collectionId);
        }, monitor.intervalMinutes * 60 * 1000);
        currentIntervals.set(monitor.id, id);
      } else if (!monitor.enabled && currentIntervals.has(monitor.id)) {
        clearInterval(currentIntervals.get(monitor.id)!);
        currentIntervals.delete(monitor.id);
      }
    });

    const activeIds = new Set(monitors.filter(m => m.enabled).map(m => m.id));
    currentIntervals.forEach((interval, id) => {
      if (!activeIds.has(id)) {
        clearInterval(interval);
        currentIntervals.delete(id);
      }
    });

    return () => {
      currentIntervals.forEach(interval => clearInterval(interval));
      currentIntervals.clear();
    };
  }, [monitors, runMonitor]);

  const handleSubmit = () => {
    if (!formName.trim() || !formCollectionId) return;
    if (editingId) {
      updateMonitor(editingId, {
        name: formName.trim(),
        collectionId: formCollectionId,
        intervalMinutes: formInterval,
      });
      setEditingId(null);
    } else {
      addMonitor({
        name: formName.trim(),
        collectionId: formCollectionId,
        intervalMinutes: formInterval,
        enabled: false,
      });
    }
    setFormName('');
    setFormCollectionId('');
    setFormInterval(5);
    setShowForm(false);
  };

  const handleEdit = (id: string) => {
    const monitor = monitors.find(m => m.id === id);
    if (!monitor) return;
    setFormName(monitor.name);
    setFormCollectionId(monitor.collectionId);
    setFormInterval(monitor.intervalMinutes);
    setEditingId(id);
    setShowForm(true);
  };

  const getCollectionName = (id: string) => {
    return collections.find(c => c.id === id)?.name || 'Unknown';
  };

  const formatLastRun = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalContent className="max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Monitors</ModalTitle>
          <ModalDescription>Schedule automated collection runs</ModalDescription>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {showForm && (
            <div className="border border-utility-subdued rounded-lg p-4 space-y-3">
              <Typography variant="subheading-small">
                {editingId ? 'Edit Monitor' : 'Add Monitor'}
              </Typography>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Monitor name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={formCollectionId}
                  onChange={(e) => setFormCollectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select collection</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={formInterval}
                  onChange={(e) => setFormInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="small" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  Cancel
                </Button>
                <Button variant="primary" size="small" onClick={handleSubmit}>
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          )}

          {!showForm && (
            <Button variant="secondary" size="small" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              Add Monitor
            </Button>
          )}

          {monitors.length === 0 && !showForm && (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-label-muted mx-auto mb-2" />
              <Typography variant="body-medium" className="text-label-muted">
                No monitors configured
              </Typography>
              <Typography variant="body-small" className="text-label-muted">
                Add a monitor to schedule automated collection runs
              </Typography>
            </div>
          )}

          <div className="space-y-2">
            {monitors.map(monitor => (
              <div
                key={monitor.id}
                className="border border-utility-subdued rounded-lg p-3 flex items-center gap-3"
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    monitor.lastStatus === 'success' && 'bg-status-success-mid',
                    monitor.lastStatus === 'failure' && 'bg-status-danger-mid',
                    monitor.lastStatus === 'running' && 'bg-status-caution-mid animate-pulse',
                    !monitor.lastStatus && 'bg-label-muted'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <Typography variant="subheading-small" className="truncate">
                    {monitor.name}
                  </Typography>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Typography variant="caption" className="text-label-muted">
                      {getCollectionName(monitor.collectionId)}
                    </Typography>
                    <Typography variant="caption" className="text-label-muted">
                      · Every {INTERVAL_OPTIONS.find(o => o.value === monitor.intervalMinutes)?.label || `${monitor.intervalMinutes}m`}
                    </Typography>
                    <Typography variant="caption" className="text-label-muted">
                      · {formatLastRun(monitor.lastRun)}
                    </Typography>
                  </div>
                  {monitor.lastResults && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-status-success-mid">
                        <Check className="w-3 h-3" /> {monitor.lastResults.passed}
                      </span>
                      {monitor.lastResults.failed > 0 && (
                        <span className="flex items-center gap-1 text-xs text-status-danger-mid">
                          <X className="w-3 h-3" /> {monitor.lastResults.failed}
                        </span>
                      )}
                      <span className="text-xs text-label-muted">
                        / {monitor.lastResults.total} total
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => runMonitor(monitor.id, monitor.collectionId)}
                    className="p-1.5 rounded-md hover:bg-surface-muted text-label-muted hover:text-label-vivid"
                    title="Run now"
                  >
                    {monitor.lastStatus === 'running' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(monitor.id)}
                    className="p-1.5 rounded-md hover:bg-surface-muted text-label-muted hover:text-label-vivid"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleMonitor(monitor.id)}
                    className={cn(
                      'p-1.5 rounded-md hover:bg-surface-muted',
                      monitor.enabled ? 'text-status-success-mid' : 'text-label-muted'
                    )}
                    title={monitor.enabled ? 'Disable' : 'Enable'}
                  >
                    {monitor.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteMonitor(monitor.id)}
                    className="p-1.5 rounded-md hover:bg-surface-muted text-label-muted hover:text-status-danger-mid"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
