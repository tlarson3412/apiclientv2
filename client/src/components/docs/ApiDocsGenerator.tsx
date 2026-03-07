import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Download, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiRequest, Collection } from '@/types';

interface ApiDocsGeneratorProps {
  open: boolean;
  onClose: () => void;
}

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-600',
    POST: 'bg-blue-600',
    PUT: 'bg-amber-600',
    PATCH: 'bg-orange-600',
    DELETE: 'bg-red-600',
    HEAD: 'bg-purple-600',
    OPTIONS: 'bg-gray-600',
  };
  return colors[method] || 'bg-gray-600';
}

function generateMarkdown(collection: Collection, requests: ApiRequest[]): string {
  const collectionRequests = requests.filter(r => r.collectionId === collection.id);
  const lines: string[] = [];

  lines.push(`# ${collection.name}`);
  lines.push('');

  if (collection.description) {
    lines.push(collection.description);
    lines.push('');
  }

  const folderRequests = new Map<string, ApiRequest[]>();
  const rootRequests: ApiRequest[] = [];

  for (const req of collectionRequests) {
    if (req.folderId) {
      const existing = folderRequests.get(req.folderId) || [];
      existing.push(req);
      folderRequests.set(req.folderId, existing);
    } else {
      rootRequests.push(req);
    }
  }

  for (const folder of collection.folders) {
    const reqs = folderRequests.get(folder.id);
    if (!reqs || reqs.length === 0) continue;

    lines.push(`## ${folder.name}`);
    lines.push('');

    for (const req of reqs) {
      lines.push(...formatRequest(req));
    }
  }

  if (rootRequests.length > 0) {
    if (collection.folders.length > 0) {
      lines.push('## General');
      lines.push('');
    }

    for (const req of rootRequests) {
      lines.push(...formatRequest(req));
    }
  }

  return lines.join('\n');
}

function formatRequest(req: ApiRequest): string[] {
  const lines: string[] = [];

  lines.push(`### ${req.method} ${req.url || '(no URL)'}`);
  lines.push('');

  if (req.description) {
    lines.push(req.description);
    lines.push('');
  }

  const enabledHeaders = req.headers.filter(h => h.enabled && h.key);
  if (enabledHeaders.length > 0) {
    lines.push('**Headers:**');
    lines.push('| Key | Value |');
    lines.push('|-----|-------|');
    for (const h of enabledHeaders) {
      lines.push(`| ${h.key} | ${h.value} |`);
    }
    lines.push('');
  }

  const enabledParams = req.queryParams.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    lines.push('**Query Parameters:**');
    lines.push('| Key | Value |');
    lines.push('|-----|-------|');
    for (const p of enabledParams) {
      lines.push(`| ${p.key} | ${p.value} |`);
    }
    lines.push('');
  }

  if (req.body && req.bodyType !== 'none') {
    lines.push('**Body:**');
    const lang = req.bodyType === 'json' ? 'json' : '';
    lines.push('```' + lang);
    lines.push(req.body);
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines;
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.slice(1, -1).split('|').map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/^\|[-| ]+\|$/gm, '');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
  });

  html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => {
    return `<table border="1" cellpadding="6" cellspacing="0">${match}</table>`;
  });

  html = html.replace(/\n\n/g, '\n<br />\n');

  return html;
}

function wrapInHtmlTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - API Documentation</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  h2 { font-size: 1.5em; margin-top: 2em; color: #374151; }
  h3 { font-size: 1.1em; margin-top: 1.5em; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 6px; }
  table { border-collapse: collapse; margin: 12px 0; width: 100%; }
  td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 14px; }
  tr:first-child td { font-weight: 600; background: #f9fafb; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  strong { color: #374151; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function ApiDocsGenerator({ open, onClose }: ApiDocsGeneratorProps) {
  const collections = useStore(s => s.collections);
  const requests = useStore(s => s.requests);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  const markdown = useMemo(() => {
    if (!selectedCollection) return '';
    return generateMarkdown(selectedCollection, requests);
  }, [selectedCollection, requests]);

  const previewHtml = useMemo(() => {
    if (!markdown) return '';
    return markdownToHtml(markdown);
  }, [markdown]);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const handleDownloadHtml = useCallback(() => {
    if (!selectedCollection) return;
    const html = wrapInHtmlTemplate(selectedCollection.name, markdownToHtml(markdown));
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection.name.replace(/\s+/g, '-').toLowerCase()}-api-docs.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedCollection, markdown]);

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-[800px] min-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>API Documentation Generator</ModalTitle>
          <ModalDescription>Generate documentation from your API collections</ModalDescription>
        </ModalHeader>

        <div className="mb-3">
          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="h-9 w-full px-3 text-[14px] bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:border-standard-subdued"
          >
            <option value="">Select a collection...</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedCollection && markdown ? (
          <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList>
              <TabsTrigger value="preview">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Preview
                </span>
              </TabsTrigger>
              <TabsTrigger value="export">
                <span className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  Export
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-auto border border-utility-subdued rounded-md p-4 mt-3">
              <div
                className="prose-docs"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-hidden flex flex-col mt-3">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleCopyMarkdown}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Markdown'}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleDownloadHtml}
                >
                  <Download className="h-4 w-4" />
                  Download HTML
                </Button>
              </div>
              <div className="flex-1 overflow-auto border border-utility-subdued rounded-md">
                <pre className="p-4 text-[12px] leading-relaxed font-mono text-label-mid whitespace-pre-wrap break-words">
                  {markdown}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center py-16 border border-utility-subdued rounded-md">
            <div className="text-center">
              <FileText className="h-10 w-10 text-label-muted mx-auto mb-3" />
              <p className="text-[14px] text-label-muted">
                Select a collection to generate API documentation
              </p>
            </div>
          </div>
        )}
      </ModalContent>

      <style>{`
        .prose-docs h1 { font-size: 24px; font-weight: 600; color: var(--label-vivid); border-bottom: 2px solid var(--utility-subdued); padding-bottom: 8px; margin-bottom: 12px; }
        .prose-docs h2 { font-size: 20px; font-weight: 600; color: var(--label-vivid); margin-top: 24px; margin-bottom: 8px; }
        .prose-docs h3 { font-size: 14px; font-weight: 500; font-family: ui-monospace, monospace; background: var(--surface-muted); padding: 6px 10px; border-radius: 4px; margin-top: 16px; margin-bottom: 8px; color: var(--label-vivid); }
        .prose-docs strong { color: var(--label-vivid); font-size: 13px; }
        .prose-docs table { border-collapse: collapse; margin: 8px 0 12px; width: 100%; font-size: 13px; }
        .prose-docs td { border: 1px solid var(--utility-subdued); padding: 4px 10px; color: var(--label-mid); }
        .prose-docs tr:first-child td { font-weight: 600; background: var(--surface-muted); color: var(--label-vivid); }
        .prose-docs pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 8px 0; }
        .prose-docs hr { border: none; border-top: 1px solid var(--utility-subdued); margin: 16px 0; }
        .prose-docs br { display: block; margin: 4px 0; }
      `}</style>
    </Modal>
  );
}