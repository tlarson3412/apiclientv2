import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { TextInput } from '@/components/ui/text-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

export function EnvironmentsPanel() {
  const environments = useStore(s => s.environments);
  const activeEnvironmentId = useStore(s => s.activeEnvironmentId);
  const addEnvironment = useStore(s => s.addEnvironment);
  const deleteEnvironment = useStore(s => s.deleteEnvironment);
  const setActiveEnvironment = useStore(s => s.setActiveEnvironment);
  const addVariable = useStore(s => s.addVariable);
  const updateVariable = useStore(s => s.updateVariable);
  const deleteVariable = useStore(s => s.deleteVariable);
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedEnvs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (newName.trim()) {
      addEnvironment(newName.trim());
      setNewName('');
      setShowAdd(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Environments</Typography>
        <Button variant="text" size="small" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <TextInput
            label="Environment name"
            value={newName}
            onValueChange={setNewName}
            className="flex-1"
          />
          <Button variant="primary" size="small" onClick={handleAdd}>Add</Button>
        </div>
      )}

      {environments.length === 0 && (
        <Typography variant="caption" className="text-center py-4">
          No environments yet
        </Typography>
      )}

      {environments.map(env => {
        const isExpanded = expandedEnvs.has(env.id);
        const isActive = env.id === activeEnvironmentId;

        return (
          <div key={env.id} className={cn(isActive && 'bg-standard-muted rounded')}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button onClick={() => toggleExpanded(env.id)} className="shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-label-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-label-muted" />}
              </button>
              <Settings className="w-4 h-4 text-standard-subdued shrink-0" />
              <button
                className="flex-1 text-left text-[14px] text-label-vivid truncate"
                onClick={() => setActiveEnvironment(isActive ? null : env.id)}
              >
                {env.name}
                {isActive && <span className="text-[11px] text-status-success-mid ml-2">Active</span>}
              </button>
              <button
                className="p-0.5 rounded hover:bg-status-danger-muted transition-colors shrink-0"
                onClick={() => deleteEnvironment(env.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
              </button>
            </div>

            {isExpanded && (
              <div className="ml-6 px-2 pb-2 flex flex-col gap-1">
                {env.variables.map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-[12px]">
                    <Checkbox
                      checked={v.enabled}
                      onCheckedChange={(c) => updateVariable(env.id, v.id, { enabled: !!c })}
                    />
                    <input
                      value={v.key}
                      onChange={e => updateVariable(env.id, v.id, { key: e.target.value })}
                      className="flex-1 bg-transparent border-b border-utility-subdued px-1 py-0.5 text-label-vivid focus:outline-none focus:border-standard-subdued"
                      placeholder="key"
                    />
                    <input
                      value={v.value}
                      onChange={e => updateVariable(env.id, v.id, { value: e.target.value })}
                      className="flex-1 bg-transparent border-b border-utility-subdued px-1 py-0.5 text-label-mid focus:outline-none focus:border-standard-subdued"
                      placeholder="value"
                    />
                    <button onClick={() => deleteVariable(env.id, v.id)} className="shrink-0">
                      <Trash2 className="w-3 h-3 text-status-danger-mid" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => addVariable(env.id, { key: '', value: '', enabled: true, type: 'string' })}
                  className="self-start text-[12px]"
                >
                  <Plus className="w-3 h-3" /> Add Variable
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
