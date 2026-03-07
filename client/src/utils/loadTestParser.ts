export interface ParsedDataFile {
  columns: string[];
  rows: Record<string, string>[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(content: string): ParsedDataFile {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { columns: [], rows: [] };
  }

  const columns = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });
    rows.push(row);
  }

  return { columns, rows };
}

export function parseJSONData(content: string): ParsedDataFile {
  const data = JSON.parse(content);
  if (!Array.isArray(data) || data.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  const rows = data.map(item => {
    const row: Record<string, string> = {};
    columns.forEach(col => {
      row[col] = item[col] !== undefined ? String(item[col]) : '';
    });
    return row;
  });

  return { columns, rows };
}

export function parseDataFile(content: string, filename: string): ParsedDataFile {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'json') {
    return parseJSONData(content);
  }
  return parseCSV(content);
}
