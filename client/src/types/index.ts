export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql' | 'binary';

export type AuthType = 'inherit' | 'none' | 'basic' | 'bearer' | 'api-key' | 'digest' | 'oauth2';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormDataEntry {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  fileName?: string;
  fileContentBase64?: string;
  contentType?: string;
  enabled: boolean;
}

export interface OAuth2Config {
  grantType: 'client_credentials' | 'password';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export interface DigestAuthConfig {
  username: string;
  password: string;
}

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  digest?: DigestAuthConfig;
  oauth2?: OAuth2Config;
}

export interface ClientCertConfig {
  enabled: boolean;
  certPem: string;
  keyPem: string;
  caPem?: string;
  passphrase?: string;
}

export type AssertionType = 'status' | 'body-contains' | 'body-not-contains' | 'json-path' | 'response-time' | 'header-exists' | 'header-equals';

export interface TestAssertion {
  id: string;
  type: AssertionType;
  property?: string;
  expected: string;
  enabled: boolean;
}

export interface TestResult {
  assertionId: string;
  passed: boolean;
  message: string;
  actual?: string;
}

export type ExtractionSource = 'json-path' | 'regex' | 'header';

export interface ResponseExtraction {
  id: string;
  name: string;
  source: ExtractionSource;
  expression: string;
  variableName: string;
  enabled: boolean;
}

export interface TimingBreakdown {
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export interface Cookie {
  id: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  pathVariables?: KeyValuePair[];
  body: string;
  bodyType: BodyType;
  bodyFormData?: FormDataEntry[];
  bodyUrlEncoded?: KeyValuePair[];
  auth: AuthConfig;
  assertions?: TestAssertion[];
  extractions?: ResponseExtraction[];
  description?: string;
  preRequestScript?: string;
  testScript?: string;
  jsonSchema?: string;
  pinned?: boolean;
  collectionId?: string;
  folderId?: string;
  clientCert?: ClientCertConfig;
  examples?: RequestExample[];
  createdAt: number;
  updatedAt: number;
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: string;
  auth?: {
    username: string;
    password: string;
  };
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  contentType: string;
  timing?: TimingBreakdown;
  testResults?: TestResult[];
}

export interface RequestExample {
  id: string;
  name: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  folders: CollectionFolder[];
  starred?: boolean;
  variables?: EnvironmentVariable[];
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionFolder {
  id: string;
  name: string;
  parentId?: string;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: number;
  updatedAt: number;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type: 'string' | 'secret';
}

export interface HistoryEntry {
  id: string;
  request: ApiRequest;
  response: ApiResponse;
  timestamp: number;
}

export interface RequestTab {
  id: string;
  requestId: string;
  name: string;
  isModified: boolean;
  type?: 'request' | 'collection' | 'folder';
  collectionId?: string;
  folderId?: string;
}

export interface CollectionTestResult {
  requestId: string;
  requestName: string;
  method: HttpMethod;
  url: string;
  status: number;
  time: number;
  assertions: TestResult[];
  passed: boolean;
  error?: string;
}

export interface LoadTestConfig {
  concurrency: number;
  delayMs: number;
  stopOnErrorThreshold: number;
  retryCount: number;
}

export interface LoadTestIterationResult {
  iteration: number;
  rowData: Record<string, string>;
  status: number;
  statusText: string;
  time: number;
  size: number;
  assertions: TestResult[];
  passed: boolean;
  error?: string;
  resolvedUrl: string;
}

export interface GlobalSettings {
  requestTimeout: number;
  maxResponseSizeMb: number;
  followRedirects: boolean;
  sslCertificateVerification: boolean;
  trimKeysAndValues: boolean;
  sendNoCacheHeader: boolean;
  autoFollowRedirects: boolean;
  globalCert?: ClientCertConfig;
}

export interface LoadTestRunStats {
  totalIterations: number;
  completedIterations: number;
  passedIterations: number;
  failedIterations: number;
  errorRate: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  totalTime: number;
  statusDistribution: Record<number, number>;
}
