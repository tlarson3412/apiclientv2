import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export function DocumentationEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  if (!activeRequest) return null;

  const description = activeRequest.description || '';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Documentation</Typography>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'edit' ? 'utility' : 'text'}
            size="small"
            onClick={() => setMode('edit')}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Button>
          <Button
            variant={mode === 'preview' ? 'utility' : 'text'}
            size="small"
            onClick={() => setMode('preview')}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          value={description}
          onChange={(e) => updateRequest(activeRequest.id, { description: e.target.value })}
          placeholder="Add notes, documentation, or description for this request. Supports Markdown (# headings, **bold**, *italic*, `code`, lists, tables, links)."
          rows={8}
          className="w-full px-3 py-2 rounded-md border border-utility-mid bg-surface text-[13px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-2 focus:ring-standard-subdued resize-y font-mono"
        />
      ) : (
        <div className="min-h-[100px] px-3 py-2 rounded-md border border-utility-subdued bg-surface">
          {description ? (
            <div className="prose prose-sm max-w-none text-label-mid prose-headings:text-label-vivid prose-headings:font-semibold prose-a:text-standard-subdued prose-a:no-underline hover:prose-a:underline prose-code:text-standard-subdued prose-code:bg-surface-alternate-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface-alternate-muted prose-pre:border prose-pre:border-utility-subdued prose-strong:text-label-vivid prose-blockquote:border-standard-subdued prose-blockquote:text-label-muted prose-th:text-label-vivid prose-td:text-label-mid prose-hr:border-utility-subdued prose-img:rounded prose-img:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{description}</ReactMarkdown>
            </div>
          ) : (
            <Typography variant="body-small" className="text-label-muted py-4 text-center">
              No documentation added yet
            </Typography>
          )}
        </div>
      )}
    </div>
  );
}
