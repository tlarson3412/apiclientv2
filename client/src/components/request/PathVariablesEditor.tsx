import { Input } from '@/components/ui/input';
import type { KeyValuePair } from '@/types';

interface PathVariablesEditorProps {
  variables: KeyValuePair[];
  onChange: (variables: KeyValuePair[]) => void;
}

export function PathVariablesEditor({ variables, onChange }: PathVariablesEditorProps) {
  if (variables.length === 0) return null;

  const handleValueChange = (id: string, value: string) => {
    onChange(variables.map(v => v.id === id ? { ...v, value } : v));
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_2fr] gap-2 px-1 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <span>Key</span>
        <span>Value</span>
      </div>
      {variables.map(v => (
        <div key={v.id} className="grid grid-cols-[1fr_2fr] gap-2 items-center">
          <div className="px-3 py-1.5 text-sm font-mono text-muted-foreground bg-muted/40 rounded border border-transparent">
            :{v.key}
          </div>
          <Input
            value={v.value}
            onChange={e => handleValueChange(v.id, e.target.value)}
            placeholder={`Enter ${v.key}`}
            className="h-8 text-sm font-mono"
          />
        </div>
      ))}
    </div>
  );
}
