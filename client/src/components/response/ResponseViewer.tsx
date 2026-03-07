import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Copy, Download, Check, Clock, HardDrive, Search, X, WrapText, Link2, Save, ChevronDown, MoreHorizontal, Filter, ChevronUp } from 'lucide-react';
import usBankLogo from '@/assets/US-Bank-Logo.png';
import { cn } from '@/lib/utils';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { xml } from '@codemirror/lang-xml';
import { CodeGenerator } from './CodeGenerator';
import { ResponseVisualizer } from './ResponseVisualizer';
import { TestResultsPanel } from './TestResultsPanel';
import { TimelineChart } from './TimelineChart';
import { ResponseChart } from './ResponseChart';

function StatusBadge({ status, statusText }: { status: number; statusText: string }) {
  let colorClass = 'text-label-muted';
  if (status >= 200 && status < 300) colorClass = 'text-status-success-mid';
  else if (status >= 300 && status < 400) colorClass = 'text-status-info-mid';
  else if (status >= 400 && status < 500) colorClass = 'text-status-caution-mid';
  else if (status >= 500) colorClass = 'text-status-danger-mid';

  return (
    <span className={cn('font-semibold text-[13px]', colorClass)}>
      {status} {statusText}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ResponseBodyView({ body, contentType, wordWrap }: { body: string; contentType: string; wordWrap: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    let displayBody = body;
    let langExt: any = [];
    if (contentType.includes('json')) {
      try {
        displayBody = JSON.stringify(JSON.parse(body), null, 2);
      } catch {}
      langExt = json();
    } else if (contentType.includes('html')) {
      langExt = html();
    } else if (contentType.includes('xml')) {
      langExt = xml();
    }

    const state = EditorState.create({
      doc: displayBody,
      extensions: [
        basicSetup,
        ...(Array.isArray(langExt) ? langExt : [langExt]),
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px', backgroundColor: 'transparent' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)', padding: '8px 0' },
          '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid var(--color-utility-subdued)', color: 'var(--color-label-muted)', fontSize: '12px', minWidth: '40px' },
          '.cm-activeLineGutter': { backgroundColor: 'transparent' },
          '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-standard-subdued) 8%, transparent)' },
          '.cm-line': { padding: '0 8px' },
        }),
        ...(wordWrap ? [EditorView.lineWrapping] : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [body, contentType, wordWrap]);

  return <div ref={editorRef} className="flex-1 min-h-[200px] overflow-hidden" />;
}

function InlineSearch({ body }: { body: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  useEffect(() => {
    if (!searchTerm) { setMatches(0); setCurrentMatch(0); return; }
    const text = caseSensitive ? body : body.toLowerCase();
    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = text.indexOf(term, idx)) !== -1) { count++; idx++; }
    setMatches(count);
    setCurrentMatch(count > 0 ? 1 : 0);
  }, [searchTerm, caseSensitive, body]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border border-utility-subdued rounded bg-surface-alternate-muted">
      <Search className="w-3.5 h-3.5 text-label-muted shrink-0" />
      <input
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search"
        className="w-[160px] bg-transparent text-[12px] text-label-mid placeholder:text-label-muted focus:outline-none font-mono"
        autoFocus
      />
      {searchTerm && (
        <span className="text-[11px] text-label-muted whitespace-nowrap">
          {matches > 0 ? `${currentMatch}/${matches}` : 'No results'}
        </span>
      )}
      {searchTerm && matches > 0 && (
        <>
          <button onClick={() => setCurrentMatch(p => p > 1 ? p - 1 : matches)} className="p-0.5 text-label-muted hover:text-label-mid">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button onClick={() => setCurrentMatch(p => p < matches ? p + 1 : 1)} className="p-0.5 text-label-muted hover:text-label-mid">
            <ChevronDown className="w-3 h-3" />
          </button>
        </>
      )}
      <button onClick={() => setCaseSensitive(!caseSensitive)} className={cn('p-0.5 text-[10px] font-mono rounded', caseSensitive ? 'bg-standard-muted text-standard-subdued' : 'text-label-muted hover:text-label-mid')} title="Case sensitive">
        Aa
      </button>
    </div>
  );
}

type ResponseTab = 'body' | 'cookies' | 'headers' | 'test-results' | 'timeline' | 'visualize' | 'code';

export function ResponseViewer() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const responses = useStore(s => s.responses);
  const loadingRequests = useStore(s => s.loadingRequests);
  const cookies = useStore(s => s.cookies);
  const addExample = useStore(s => s.addExample);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [wordWrap, setWordWrap] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [exampleName, setExampleName] = useState('');

  if (!activeRequest) return null;

  const response = responses[activeRequest.id];
  const isLoading = loadingRequests.has(activeRequest.id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-8 h-8 border-2 border-standard-subdued border-t-transparent rounded-full animate-spin" />
        <Typography variant="body-small" className="text-label-muted">
          Sending request...
        </Typography>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <img src={usBankLogo} alt="US Bank" className="w-16 h-auto opacity-40" />
        <Typography variant="body-small" className="text-label-muted text-center">
          Enter a URL and click Send to see the response here
        </Typography>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([response.body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'response.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveExample = () => {
    if (!exampleName.trim()) return;
    addExample(activeRequest.id, exampleName.trim(), response);
    setExampleName('');
    setShowSaveMenu(false);
  };

  const testResults = response.testResults || [];
  const passCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const headerCount = Object.keys(response.headers).length;

  const responseCookies = cookies.filter(c => {
    try {
      const url = new URL(activeRequest.url.startsWith('http') ? activeRequest.url : `https://${activeRequest.url}`);
      return c.domain === url.hostname || url.hostname.endsWith(c.domain.replace(/^\./, ''));
    } catch {
      return false;
    }
  });

  const contentType = response.contentType || '';
  const isJson = contentType.includes('json');
  const bodyFormat = isJson ? 'JSON' : contentType.includes('html') ? 'HTML' : contentType.includes('xml') ? 'XML' : 'Text';

  const tabs: { id: ResponseTab; label: string; badge?: string; badgeColor?: string }[] = [
    { id: 'body', label: 'Body' },
    { id: 'cookies', label: 'Cookies', badge: responseCookies.length > 0 ? String(responseCookies.length) : undefined },
    { id: 'headers', label: 'Headers', badge: String(headerCount) },
    ...(totalTests > 0 ? [{ id: 'test-results' as ResponseTab, label: 'Test Results', badge: `${passCount}/${totalTests}`, badgeColor: passCount === totalTests ? 'text-status-success-mid' : 'text-status-danger-mid' }] : []),
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-utility-subdued">
        <div className="flex items-center gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-standard-subdued'
                  : 'text-label-muted hover:text-label-mid'
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className={cn('text-[11px]', tab.badgeColor || 'text-label-muted')}>
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-standard-subdued" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 pr-3">
          <StatusBadge status={response.status} statusText={response.statusText} />
          <span className="text-[12px] text-label-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {response.time} ms
          </span>
          <span className="text-[12px] text-label-muted flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatSize(response.size)}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="flex items-center gap-1 text-[12px] text-label-muted hover:text-label-mid transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Response
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSaveMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSaveMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-[260px] bg-surface border border-utility-subdued rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2">
                  <Typography variant="caption" className="text-label-muted font-medium">Save as Example</Typography>
                  <input
                    type="text"
                    value={exampleName}
                    onChange={e => setExampleName(e.target.value)}
                    placeholder={`${response.status} ${response.statusText}`}
                    className="w-full px-2 py-1.5 text-[12px] bg-transparent border border-utility-subdued rounded focus:outline-none focus:border-standard-subdued text-label-mid placeholder:text-label-muted"
                    onKeyDown={e => e.key === 'Enter' && handleSaveExample()}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveExample}
                    className="px-3 py-1.5 text-[12px] bg-standard-subdued text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
          <button className="text-label-muted hover:text-label-mid">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'body' && (
        <>
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-utility-subdued bg-surface-alternate-muted">
            <div className="flex items-center gap-1">
              <button className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-label-mid hover:bg-utility-muted rounded transition-colors">
                <span className="font-mono">{'{}'}</span> {bodyFormat}
                <ChevronDown className="w-3 h-3 text-label-muted" />
              </button>
              <div className="w-px h-4 bg-utility-subdued mx-1" />
              <button
                onClick={() => setActiveTab('visualize')}
                className="flex items-center gap-1 px-2 py-1 text-[12px] text-label-muted hover:text-label-mid hover:bg-utility-muted rounded transition-colors"
              >
                Visualize
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setWordWrap(!wordWrap)}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  wordWrap ? 'text-standard-subdued bg-standard-muted' : 'text-label-muted hover:text-label-mid hover:bg-utility-muted'
                )}
                title="Word wrap"
              >
                <WrapText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  showSearch ? 'text-standard-subdued bg-standard-muted' : 'text-label-muted hover:text-label-mid hover:bg-utility-muted'
                )}
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded text-label-muted hover:text-label-mid hover:bg-utility-muted transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-success-mid" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 rounded text-label-muted hover:text-label-mid hover:bg-utility-muted transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {showSearch && (
            <div className="flex items-center justify-end px-2 py-1 border-b border-utility-subdued">
              <InlineSearch body={response.body} />
              <button onClick={() => setShowSearch(false)} className="p-1 ml-1 text-label-muted hover:text-label-mid">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <ResponseBodyView body={response.body} contentType={response.contentType} wordWrap={wordWrap} />
        </>
      )}

      {activeTab === 'cookies' && (
        <div className="p-4 overflow-auto flex-1">
          {responseCookies.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Typography variant="body-small" className="text-label-muted">No cookies for this domain</Typography>
            </div>
          ) : (
            <div className="border border-utility-subdued rounded overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-surface-alternate-muted">
                    <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Value</th>
                    <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Domain</th>
                    <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {responseCookies.map((c, i) => (
                    <tr key={i} className="border-b border-utility-subdued last:border-b-0 hover:bg-utility-muted transition-colors">
                      <td className="px-3 py-1.5 font-mono text-label-vivid">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono text-label-mid break-all max-w-[200px] truncate">{c.value}</td>
                      <td className="px-3 py-1.5 font-mono text-label-muted">{c.domain}</td>
                      <td className="px-3 py-1.5 font-mono text-label-muted">{c.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'headers' && (
        <div className="p-4 overflow-auto flex-1">
          <div className="border border-utility-subdued rounded overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-alternate-muted">
                  <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key} className="border-b border-utility-subdued last:border-b-0 hover:bg-utility-muted transition-colors">
                    <td className="px-3 py-1.5 font-mono text-label-vivid whitespace-nowrap">{key}</td>
                    <td className="px-3 py-1.5 font-mono text-label-mid break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'test-results' && (
        <div className="p-4 overflow-auto flex-1">
          <TestResultsPanel />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="p-4 overflow-auto flex-1">
          <TimelineChart />
        </div>
      )}

      {activeTab === 'visualize' && (
        <div className="p-4 overflow-auto flex-1">
          <div className="flex flex-col gap-4">
            <ResponseVisualizer body={response.body} contentType={response.contentType} />
            <ResponseChart />
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div className="p-4 overflow-auto flex-1">
          <CodeGenerator />
        </div>
      )}
    </div>
  );
}
