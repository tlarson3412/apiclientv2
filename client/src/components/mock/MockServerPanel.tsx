import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Typography } from '@/components/ui/typography';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMockServerStore, type MockEndpoint } from '@/store/useMockServerStore';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, Download, X } from 'lucide-react';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
  HEAD: 'text-label-muted',
  OPTIONS: 'text-label-muted',
};

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

interface EndpointFormData {
  method: string;
  path: string;
  statusCode: number;
  responseBody: string;
  delay: number;
  responseHeaders: Record<string, string>;
  description: string;
}

const defaultFormData: EndpointFormData = {
  method: 'GET',
  path: '/',
  statusCode: 200,
  responseBody: '{}',
  delay: 0,
  responseHeaders: { 'Content-Type': 'application/json' },
  description: '',
};

function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url || '/';
  }
}

interface MockServerPanelProps {
  open: boolean;
  onClose: () => void;
}

export function MockServerPanel({ open, onClose }: MockServerPanelProps) {
  const { endpoints, isRunning, port, addEndpoint, updateEndpoint, deleteEndpoint, toggleEndpoint, setRunning } = useMockServerStore();
  const { collections, requests } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EndpointFormData>({ ...defaultFormData });
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [showImport, setShowImport] = useState(false);

  const resetForm = () => {
    setFormData({ ...defaultFormData });
    setHeaderKey('');
    setHeaderValue('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAddHeader = () => {
    if (!headerKey.trim()) return;
    setFormData(prev => ({
      ...prev,
      responseHeaders: { ...prev.responseHeaders, [headerKey.trim()]: headerValue },
    }));
    setHeaderKey('');
    setHeaderValue('');
  };

  const handleRemoveHeader = (key: string) => {
    setFormData(prev => {
      const headers = { ...prev.responseHeaders };
      delete headers[key];
      return { ...prev, responseHeaders: headers };
    });
  };

  const handleSubmit = () => {
    if (!formData.path.trim()) return;

    if (editingId) {
      updateEndpoint(editingId, {
        method: formData.method,
        path: formData.path,
        statusCode: formData.statusCode,
        responseBody: formData.responseBody,
        delay: formData.delay,
        responseHeaders: formData.responseHeaders,
        description: formData.description,
      });
    } else {
      addEndpoint({
        method: formData.method,
        path: formData.path,
        statusCode: formData.statusCode,
        responseBody: formData.responseBody,
        delay: formData.delay,
        responseHeaders: formData.responseHeaders,
        enabled: true,
        description: formData.description,
      });
    }
    resetForm();
  };

  const handleEdit = (endpoint: MockEndpoint) => {
    setEditingId(endpoint.id);
    setFormData({
      method: endpoint.method,
      path: endpoint.path,
      statusCode: endpoint.statusCode,
      responseBody: endpoint.responseBody,
      delay: endpoint.delay,
      responseHeaders: { ...endpoint.responseHeaders },
      description: endpoint.description || '',
    });
    setShowAddForm(true);
  };

  const handleToggleServer = async () => {
    const newState = !isRunning;
    try {
      await fetch(`/api/mock/${newState ? 'start' : 'stop'}`, { method: 'POST' });
    } catch {}
    setRunning(newState);
  };

  const handleImportCollection = (collectionId: string) => {
    const collectionRequests = requests.filter(r => r.collectionId === collectionId);
    collectionRequests.forEach(req => {
      if (req.examples && req.examples.length > 0) {
        const example = req.examples[0];
        addEndpoint({
          method: req.method,
          path: extractPath(req.url),
          statusCode: example.status,
          responseBody: example.body,
          responseHeaders: { 'Content-Type': 'application/json' },
          delay: 0,
          enabled: true,
          description: req.name,
        });
      }
    });
    setShowImport(false);
  };

  const renderForm = () => (
    <div className="border border-utility-subdued rounded-md p-3 space-y-3 bg-surface-muted">
      <div className="flex gap-2">
        <Select value={formData.method} onValueChange={(v) => setFormData(prev => ({ ...prev, method: v }))}>
          <SelectTrigger className="w-28 h-8 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map(m => (
              <SelectItem key={m} value={m}>
                <span className={cn('font-mono font-medium', METHOD_COLORS[m])}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="text"
          value={formData.path}
          onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
          placeholder="/api/endpoint"
          className="flex-1 h-8 px-2 text-[13px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="number"
          value={formData.statusCode}
          onChange={(e) => setFormData(prev => ({ ...prev, statusCode: parseInt(e.target.value) || 200 }))}
          className="w-20 h-8 px-2 text-[13px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Status"
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description (optional)"
          className="flex-1 h-8 px-2 text-[13px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="number"
          value={formData.delay}
          onChange={(e) => setFormData(prev => ({ ...prev, delay: parseInt(e.target.value) || 0 }))}
          className="w-24 h-8 px-2 text-[13px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Delay (ms)"
        />
      </div>

      <textarea
        value={formData.responseBody}
        onChange={(e) => setFormData(prev => ({ ...prev, responseBody: e.target.value }))}
        placeholder="Response body"
        rows={4}
        className="w-full px-2 py-1.5 text-[13px] font-mono rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring resize-y"
      />

      <div className="space-y-1.5">
        <Typography variant="caption" className="text-label-muted">Response Headers</Typography>
        <div className="space-y-1">
          {Object.entries(formData.responseHeaders).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5 text-[12px]">
              <span className="font-mono text-label-mid">{key}:</span>
              <span className="font-mono text-label-muted flex-1">{value}</span>
              <button onClick={() => handleRemoveHeader(key)} className="text-label-muted hover:text-status-danger-mid">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={headerKey}
            onChange={(e) => setHeaderKey(e.target.value)}
            placeholder="Header name"
            className="flex-1 h-7 px-2 text-[12px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={headerValue}
            onChange={(e) => setHeaderValue(e.target.value)}
            placeholder="Value"
            className="flex-1 h-7 px-2 text-[12px] rounded-md border border-utility-subdued bg-surface text-label-vivid focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button variant="utility" size="small" onClick={handleAddHeader} className="h-7 px-2 text-[12px]">
            Add
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="small" onClick={resetForm}>Cancel</Button>
        <Button variant="primary" size="small" onClick={handleSubmit}>
          {editingId ? 'Update' : 'Add'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent className="max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Mock Server</ModalTitle>
        </ModalHeader>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={isRunning ? 'destructive' : 'primary'}
            size="small"
            onClick={handleToggleServer}
          >
            {isRunning ? 'Stop' : 'Start'}
          </Button>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', isRunning ? 'bg-green-500' : 'bg-gray-400')} />
            <Typography variant="caption">Port {port}</Typography>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="small" onClick={() => { resetForm(); setShowAddForm(true); }}>
            <Plus className="w-3.5 h-3.5" />
            Add Endpoint
          </Button>
          <Button variant="utility" size="small" onClick={() => setShowImport(!showImport)}>
            <Download className="w-3.5 h-3.5" />
            Import
          </Button>
        </div>

        {showImport && (
          <div className="border border-utility-subdued rounded-md p-3 bg-surface-muted space-y-2">
            <Typography variant="subheading-small">Import from Collection</Typography>
            {collections.length === 0 ? (
              <Typography variant="caption">No collections available</Typography>
            ) : (
              <div className="space-y-1">
                {collections.map(col => {
                  const colRequests = requests.filter(r => r.collectionId === col.id && r.examples && r.examples.length > 0);
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleImportCollection(col.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-md hover:bg-surface-alternate-muted text-left"
                    >
                      <span className="text-label-vivid">{col.name}</span>
                      <span className="text-label-muted text-[11px]">{colRequests.length} requests with examples</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="secondary" size="small" onClick={() => setShowImport(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showAddForm && renderForm()}

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {endpoints.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Typography variant="body-medium" className="text-label-muted">
                No mock endpoints defined
              </Typography>
            </div>
          ) : (
            <div className="space-y-0">
              {endpoints.map((endpoint, idx) => (
                <div key={endpoint.id}>
                  <div className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md',
                    idx % 2 === 0 ? 'bg-surface' : 'bg-surface-muted'
                  )}>
                    <Checkbox
                      checked={endpoint.enabled}
                      onCheckedChange={() => toggleEndpoint(endpoint.id)}
                    />
                    <span className={cn('text-[11px] font-mono font-semibold w-14 shrink-0', METHOD_COLORS[endpoint.method] || 'text-label-muted')}>
                      {endpoint.method}
                    </span>
                    <span className="text-[13px] font-mono text-label-vivid flex-1 truncate">
                      {endpoint.path}
                    </span>
                    <span className="text-[12px] font-mono text-label-muted shrink-0">
                      {endpoint.statusCode}
                    </span>
                    {endpoint.delay > 0 && (
                      <span className="text-[11px] text-label-muted shrink-0">
                        {endpoint.delay}ms
                      </span>
                    )}
                    <button onClick={() => handleEdit(endpoint)} className="text-label-muted hover:text-label-vivid p-1">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteEndpoint(endpoint.id)} className="text-label-muted hover:text-status-danger-mid p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {editingId === endpoint.id && showAddForm && renderForm()}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
