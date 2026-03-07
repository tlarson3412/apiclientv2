import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { FlaskConical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { TestAssertion, AssertionType } from '@/types';

interface SnippetItem {
  label: string;
  type: AssertionType;
  property?: string;
  expected: string;
}

interface SnippetCategory {
  name: string;
  items: SnippetItem[];
}

const SNIPPET_CATEGORIES: SnippetCategory[] = [
  {
    name: 'Status Code',
    items: [
      { label: 'Status code is 200', type: 'status', expected: '200' },
      { label: 'Status code is 201', type: 'status', expected: '201' },
      { label: 'Status code is 400', type: 'status', expected: '400' },
      { label: 'Status code is 404', type: 'status', expected: '404' },
      { label: 'Status code is 500', type: 'status', expected: '500' },
    ],
  },
  {
    name: 'Response Body',
    items: [
      { label: 'Body contains string', type: 'body-contains', expected: '' },
      { label: 'Body does not contain string', type: 'body-not-contains', expected: '' },
    ],
  },
  {
    name: 'JSON Path',
    items: [
      { label: 'JSON value check', type: 'json-path', property: '$.', expected: '' },
    ],
  },
  {
    name: 'Performance',
    items: [
      { label: 'Response time < 200ms', type: 'response-time', expected: '200' },
      { label: 'Response time < 500ms', type: 'response-time', expected: '500' },
      { label: 'Response time < 1000ms', type: 'response-time', expected: '1000' },
    ],
  },
  {
    name: 'Headers',
    items: [
      { label: 'Header exists', type: 'header-exists', property: 'content-type', expected: '' },
      { label: 'Header equals', type: 'header-equals', property: 'content-type', expected: 'application/json' },
    ],
  },
];

interface TestSnippetLibraryProps {
  requestId: string;
  onAddSnippet?: () => void;
  compact?: boolean;
}

export function TestSnippetLibrary({ requestId, onAddSnippet, compact }: TestSnippetLibraryProps) {
  const addAssertion = useStore(s => s.addAssertion);

  const handleSnippetClick = (snippet: SnippetItem) => {
    const assertion: TestAssertion = {
      id: uuidv4(),
      type: snippet.type,
      property: snippet.property,
      expected: snippet.expected,
      enabled: true,
    };
    addAssertion(requestId, assertion);
    onAddSnippet?.();
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 p-1">
        {SNIPPET_CATEGORIES.map((category) => (
          <div key={category.name} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-label-muted font-medium px-1.5 pt-1">
              {category.name}
            </span>
            {category.items.map((snippet) => (
              <button
                key={snippet.label}
                onClick={() => handleSnippetClick(snippet)}
                className="px-1.5 py-1 text-[11px] text-left rounded text-label-muted hover:bg-utility-muted hover:text-label-mid transition-colors cursor-pointer truncate"
              >
                {snippet.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-label-muted" />
        <Typography variant="subheading-small" className="text-label-muted">
          Test Snippets
        </Typography>
      </div>

      {SNIPPET_CATEGORIES.map((category) => (
        <div key={category.name} className="flex flex-col gap-1">
          <Typography variant="caption" className="text-[11px] uppercase tracking-wider text-label-muted font-medium px-1">
            {category.name}
          </Typography>
          <div className="flex flex-wrap gap-1">
            {category.items.map((snippet) => (
              <button
                key={snippet.label}
                onClick={() => handleSnippetClick(snippet)}
                className="px-2 py-1 text-xs rounded bg-utility-muted text-label-muted hover:bg-utility-hover hover:text-label transition-colors cursor-pointer truncate"
              >
                {snippet.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
