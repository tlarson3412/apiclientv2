import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Check, X, Play } from 'lucide-react';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';

interface ValidationError {
  path: string;
  message: string;
}

function validateJsonSchema(data: any, schema: any, path: string = ''): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    if (schema.type === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        errors.push({ path: path || '(root)', message: `Expected integer, got ${actualType}` });
        return errors;
      }
    } else if (actualType !== schema.type) {
      errors.push({ path: path || '(root)', message: `Expected ${schema.type}, got ${actualType}` });
      return errors;
    }
  }

  if (schema.type === 'object' && schema.properties && typeof data === 'object' && data !== null) {
    if (schema.required && Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (!(req in data)) {
          errors.push({ path: `${path}.${req}`, message: `Missing required field` });
        }
      }
    }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        errors.push(...validateJsonSchema(data[key], propSchema, `${path}.${key}`));
      }
    }
  }

  if (schema.type === 'array' && schema.items && Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path: path || '(root)', message: `Array must have at least ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push({ path: path || '(root)', message: `Array must have at most ${schema.maxItems} items` });
    }
    data.forEach((item: any, i: number) => {
      errors.push(...validateJsonSchema(item, schema.items, `${path}[${i}]`));
    });
  }

  if (schema.type === 'string') {
    if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength) {
      errors.push({ path: path || '(root)', message: `String must be at least ${schema.minLength} chars` });
    }
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({ path: path || '(root)', message: `Value must be one of: ${schema.enum.join(', ')}` });
    }
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path: path || '(root)', message: `Must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path: path || '(root)', message: `Must be <= ${schema.maximum}` });
    }
  }

  return errors;
}

export function SchemaValidator() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const responses = useStore(s => s.responses);
  const editorRef = useRef<HTMLDivElement>(null);
  const [validationResults, setValidationResults] = useState<ValidationError[] | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current || !activeRequest) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        updateRequest(activeRequest.id, { jsonSchema: update.state.doc.toString() });
      }
    });

    const state = EditorState.create({
      doc: activeRequest.jsonSchema || '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
      extensions: [
        basicSetup,
        json(),
        updateListener,
        EditorView.theme({
          '&': { height: '180px', fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    return () => view.destroy();
  }, [activeRequest?.id]);

  if (!activeRequest) return null;

  const response = responses[activeRequest.id];

  const handleValidate = () => {
    if (!response) return;
    setSchemaError(null);

    try {
      const schema = JSON.parse(activeRequest.jsonSchema || '{}');
      let data;
      try {
        data = JSON.parse(response.body);
      } catch {
        setValidationResults([{ path: '(root)', message: 'Response body is not valid JSON' }]);
        return;
      }
      const errors = validateJsonSchema(data, schema);
      setValidationResults(errors);
    } catch {
      setSchemaError('Invalid JSON Schema');
      setValidationResults(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="body-small" className="text-label-muted">
          Define a JSON Schema to validate responses against
        </Typography>
        <Button variant="text" size="small" onClick={handleValidate} disabled={!response}>
          <Play className="w-3.5 h-3.5" /> Validate
        </Button>
      </div>

      <div ref={editorRef} className="border border-utility-subdued rounded overflow-hidden" />

      {schemaError && (
        <div className="p-2 rounded border border-status-danger-muted bg-status-danger-muted text-[13px] text-status-danger-mid">
          {schemaError}
        </div>
      )}

      {validationResults !== null && (
        <div className={`p-3 rounded border text-[13px] ${validationResults.length === 0 ? 'border-status-success-muted bg-status-success-muted' : 'border-status-danger-muted bg-status-danger-muted'}`}>
          {validationResults.length === 0 ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-status-success-mid" />
              <span className="text-status-success-mid font-medium">Response matches schema</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <X className="w-4 h-4 text-status-danger-mid" />
                <span className="text-status-danger-mid font-medium">{validationResults.length} validation error{validationResults.length > 1 ? 's' : ''}</span>
              </div>
              {validationResults.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <code className="text-label-vivid bg-utility-muted px-1 rounded shrink-0">{err.path}</code>
                  <span className="text-status-danger-mid">{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
