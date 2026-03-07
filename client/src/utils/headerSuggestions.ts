export const COMMON_HEADERS: Record<string, string[]> = {
  'Accept': ['application/json', 'text/html', 'text/plain', 'application/xml', '*/*', 'application/octet-stream'],
  'Accept-Encoding': ['gzip, deflate, br', 'gzip, deflate', 'gzip'],
  'Accept-Language': ['en-US,en;q=0.9', 'en-US', 'en-GB', '*'],
  'Authorization': ['Bearer ', 'Basic '],
  'Cache-Control': ['no-cache', 'no-store', 'max-age=0', 'max-age=3600', 'public', 'private'],
  'Content-Type': ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain', 'text/html', 'application/xml', 'application/octet-stream'],
  'Cookie': [],
  'DNT': ['1', '0'],
  'Host': [],
  'If-None-Match': [],
  'If-Modified-Since': [],
  'Origin': [],
  'Pragma': ['no-cache'],
  'Referer': [],
  'User-Agent': ['Mozilla/5.0', 'USB-API-Client/1.0'],
  'X-Api-Key': [],
  'X-Requested-With': ['XMLHttpRequest'],
  'X-Correlation-Id': [],
  'X-Request-Id': [],
  'X-Forwarded-For': [],
  'X-Forwarded-Proto': ['https', 'http'],
};

export const HEADER_NAMES = Object.keys(COMMON_HEADERS);

export function getHeaderSuggestions(input: string): string[] {
  if (!input) return HEADER_NAMES.slice(0, 10);
  const lower = input.toLowerCase();
  return HEADER_NAMES.filter(h => h.toLowerCase().includes(lower));
}

export function getValueSuggestions(headerName: string): string[] {
  return COMMON_HEADERS[headerName] || [];
}
