import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HttpMethod, BodyType, AuthConfig, KeyValuePair } from '@/types';

interface RequestTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  body: string;
  bodyType: BodyType;
  auth: AuthConfig;
}

const TEMPLATES: RequestTemplate[] = [
  {
    id: 'rest-get',
    name: 'GET Request',
    category: 'REST Basics',
    description: 'Simple GET request with JSON accept header',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [{ id: '1', key: 'Accept', value: 'application/json', enabled: true }],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
  },
  {
    id: 'rest-post',
    name: 'POST with JSON Body',
    category: 'REST Basics',
    description: 'POST request with a JSON body payload',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2),
    bodyType: 'json',
    auth: { type: 'none' },
  },
  {
    id: 'rest-put',
    name: 'PUT Update',
    category: 'REST Basics',
    description: 'PUT request to update an existing resource',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ id: 1, title: 'updated', body: 'updated body', userId: 1 }, null, 2),
    bodyType: 'json',
    auth: { type: 'none' },
  },
  {
    id: 'rest-delete',
    name: 'DELETE Request',
    category: 'REST Basics',
    description: 'DELETE request to remove a resource',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: [],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
  },
  {
    id: 'auth-bearer',
    name: 'Bearer Token Auth',
    category: 'Authentication',
    description: 'GET request with Bearer token authorization',
    method: 'GET',
    url: 'https://api.example.com/protected',
    headers: [{ id: '1', key: 'Accept', value: 'application/json', enabled: true }],
    body: '',
    bodyType: 'none',
    auth: { type: 'bearer', bearer: { token: 'your-token-here' } },
  },
  {
    id: 'auth-basic',
    name: 'Basic Auth',
    category: 'Authentication',
    description: 'GET request with Basic authentication',
    method: 'GET',
    url: 'https://api.example.com/protected',
    headers: [],
    body: '',
    bodyType: 'none',
    auth: { type: 'basic', basic: { username: 'user', password: 'pass' } },
  },
  {
    id: 'auth-apikey',
    name: 'API Key Auth',
    category: 'Authentication',
    description: 'GET request with API Key in header',
    method: 'GET',
    url: 'https://api.example.com/data',
    headers: [],
    body: '',
    bodyType: 'none',
    auth: { type: 'api-key', apiKey: { key: 'X-Api-Key', value: 'your-key', addTo: 'header' } },
  },
  {
    id: 'form-urlencoded',
    name: 'Form URL Encoded',
    category: 'Forms',
    description: 'POST with URL-encoded form data',
    method: 'POST',
    url: 'https://httpbin.org/post',
    headers: [{ id: '1', key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true }],
    body: 'username=john&password=secret',
    bodyType: 'x-www-form-urlencoded',
    auth: { type: 'none' },
  },
  {
    id: 'graphql-query',
    name: 'GraphQL Query',
    category: 'GraphQL',
    description: 'GraphQL query with variables',
    method: 'POST',
    url: 'https://api.spacex.land/graphql/',
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    body: JSON.stringify({
      query: '{ launchesPast(limit: 5) { mission_name launch_date_local } }',
      variables: {},
    }, null, 2),
    bodyType: 'graphql',
    auth: { type: 'none' },
  },
  {
    id: 'file-download',
    name: 'File Download',
    category: 'Misc',
    description: 'GET request to download a file',
    method: 'GET',
    url: 'https://httpbin.org/image/png',
    headers: [{ id: '1', key: 'Accept', value: 'image/png', enabled: true }],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
};

export function TemplatesPanel() {
  const addTab = useStore(s => s.addTab);
  const updateRequest = useStore(s => s.updateRequest);

  const handleUseTemplate = (template: RequestTemplate) => {
    addTab();
    const state = useStore.getState();
    const activeReq = state.getActiveRequest();
    if (activeReq) {
      updateRequest(activeReq.id, {
        name: template.name,
        method: template.method,
        url: template.url,
        headers: template.headers,
        body: template.body,
        bodyType: template.bodyType,
        auth: template.auth,
      });
    }
  };

  const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Typography variant="subheading-small">Templates</Typography>
      <Typography variant="caption" className="text-label-muted">
        Pre-built request templates to help you get started quickly
      </Typography>

      {categories.map(category => (
        <div key={category} className="flex flex-col gap-1">
          <Typography variant="caption" className="px-1 py-1 text-label-muted font-medium uppercase tracking-wider text-[10px]">
            {category}
          </Typography>
          {TEMPLATES.filter(t => t.category === category).map(template => (
            <button
              key={template.id}
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-utility-muted transition-colors text-left group"
              onClick={() => handleUseTemplate(template)}
            >
              <span className={cn('text-[11px] font-mono font-semibold w-12 shrink-0', METHOD_COLORS[template.method])}>
                {template.method}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-label-vivid">{template.name}</div>
                <div className="text-[11px] text-label-muted truncate">{template.description}</div>
              </div>
              <Plus className="w-3.5 h-3.5 text-label-muted opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
