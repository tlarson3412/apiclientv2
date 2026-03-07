import type { ApiResponse, TestAssertion, TestResult } from '../types';

function evaluateJsonPath(obj: any, path: string): any {
  try {
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  } catch {
    return undefined;
  }
}

export function runAssertions(response: ApiResponse, assertions: TestAssertion[]): TestResult[] {
  return assertions
    .filter(a => a.enabled)
    .map(assertion => {
      try {
        switch (assertion.type) {
          case 'status': {
            const expected = parseInt(assertion.expected, 10);
            const passed = response.status === expected;
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `Status is ${expected}`
                : `Expected status ${expected}, got ${response.status}`,
              actual: String(response.status),
            };
          }

          case 'body-contains': {
            const passed = response.body.includes(assertion.expected);
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `Body contains "${assertion.expected}"`
                : `Body does not contain "${assertion.expected}"`,
            };
          }

          case 'body-not-contains': {
            const passed = !response.body.includes(assertion.expected);
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `Body does not contain "${assertion.expected}"`
                : `Body contains "${assertion.expected}" (unexpected)`,
            };
          }

          case 'json-path': {
            let parsed: any;
            try {
              parsed = JSON.parse(response.body);
            } catch {
              return {
                assertionId: assertion.id,
                passed: false,
                message: 'Response body is not valid JSON',
              };
            }
            const path = assertion.property || '';
            const actual = evaluateJsonPath(parsed, path);
            const actualStr = typeof actual === 'object' ? JSON.stringify(actual) : String(actual ?? '');
            const passed = actualStr === assertion.expected;
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `${path} equals "${assertion.expected}"`
                : `${path}: expected "${assertion.expected}", got "${actualStr}"`,
              actual: actualStr,
            };
          }

          case 'response-time': {
            const maxTime = parseInt(assertion.expected, 10);
            const passed = response.time <= maxTime;
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `Response time ${response.time}ms <= ${maxTime}ms`
                : `Response time ${response.time}ms exceeds ${maxTime}ms`,
              actual: String(response.time),
            };
          }

          case 'header-exists': {
            const headerName = (assertion.property || assertion.expected).toLowerCase();
            const exists = Object.keys(response.headers).some(
              k => k.toLowerCase() === headerName
            );
            return {
              assertionId: assertion.id,
              passed: exists,
              message: exists
                ? `Header "${headerName}" exists`
                : `Header "${headerName}" not found`,
            };
          }

          case 'header-equals': {
            const headerName = (assertion.property || '').toLowerCase();
            const headerEntry = Object.entries(response.headers).find(
              ([k]) => k.toLowerCase() === headerName
            );
            const actual = headerEntry ? headerEntry[1] : '';
            const passed = actual === assertion.expected;
            return {
              assertionId: assertion.id,
              passed,
              message: passed
                ? `Header "${headerName}" equals "${assertion.expected}"`
                : `Header "${headerName}": expected "${assertion.expected}", got "${actual}"`,
              actual,
            };
          }

          default:
            return {
              assertionId: assertion.id,
              passed: false,
              message: `Unknown assertion type: ${assertion.type}`,
            };
        }
      } catch (err: any) {
        return {
          assertionId: assertion.id,
          passed: false,
          message: `Error: ${err.message}`,
        };
      }
    });
}
