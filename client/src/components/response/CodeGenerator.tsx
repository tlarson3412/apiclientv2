import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Typography } from '@/components/ui/typography';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import {
  generateCurl,
  generateJavaScriptFetch,
  generatePythonRequests,
  generateNodeFetch,
} from '@/utils/codeGenerators';

type Language = 'curl' | 'javascript' | 'python' | 'nodejs';

const languageLabels: Record<Language, string> = {
  curl: 'cURL',
  javascript: 'JavaScript Fetch',
  python: 'Python Requests',
  nodejs: 'Node.js',
};

const generators: Record<Language, typeof generateCurl> = {
  curl: generateCurl,
  javascript: generateJavaScriptFetch,
  python: generatePythonRequests,
  nodejs: generateNodeFetch,
};

export function CodeGenerator() {
  const [language, setLanguage] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);
  const activeRequest = useStore((s) => s.getActiveRequest());
  const interpolate = useStore((s) => s.interpolateVariables);

  const code = useMemo(() => {
    if (!activeRequest) return '';
    return generators[language](activeRequest, interpolate);
  }, [activeRequest, language, interpolate]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeRequest) {
    return (
      <div className="flex items-center justify-center p-6">
        <Typography variant="body-medium" className="text-label-muted">
          No active request selected
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <Typography variant="subheading-small">Code Snippet</Typography>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className={cn('w-[180px] border-utility-subdued bg-surface text-label-vivid text-sm')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(languageLabels) as Language[]).map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {languageLabels[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="utility" size="small" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <pre
        className={cn(
          'overflow-auto rounded-md border border-utility-subdued bg-surface p-4 font-mono text-sm text-label-vivid',
          'max-h-[400px]'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
