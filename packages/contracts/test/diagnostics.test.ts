import { describe, expect, it } from 'vitest';
import {
  CODESTELLATION_DIAGNOSTIC_CODES,
  CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION,
  createDiagnostic,
  isCodestellationDiagnostic,
  isDiagnosticCode,
  isDiagnosticSeverity,
  parseDiagnosticCode,
  sanitizeDiagnosticContext,
  toSerializableDiagnostic
} from '../src/index';

describe('codestellation diagnostics', () => {
  it('creates stable serializable diagnostics with retry metadata', () => {
    const diagnostic = createDiagnostic({
      code: 'INGESTION_SOURCE_UNAVAILABLE',
      severity: 'error',
      message: 'Source folder is not available.',
      retryable: true,
      context: {
        sourceKind: 'local-folder',
        attempt: 2,
        recoverable: true
      }
    });

    expect(diagnostic).toEqual({
      schemaVersion: CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION,
      code: 'INGESTION_SOURCE_UNAVAILABLE',
      severity: 'error',
      message: 'Source folder is not available.',
      retryable: true,
      context: {
        attempt: 2,
        recoverable: true,
        sourceKind: 'local-folder'
      }
    });
    expect(JSON.parse(JSON.stringify(diagnostic))).toEqual(diagnostic);
  });

  it('validates diagnostic codes and severities', () => {
    expect(parseDiagnosticCode('CONTRACTS_VALIDATION_FAILED')).toBe('CONTRACTS_VALIDATION_FAILED');
    expect(isDiagnosticCode('CONTRACTS_VALIDATION_FAILED')).toBe(true);
    expect(isDiagnosticCode('contracts.validation_failed')).toBe(false);
    expect(isDiagnosticSeverity('warning')).toBe(true);
    expect(isDiagnosticSeverity('critical')).toBe(false);
    expect(() => parseDiagnosticCode(' bad')).toThrow('leading or trailing whitespace');
    expect(() => parseDiagnosticCode('bad-code')).toThrow('uppercase');
  });

  it('rejects empty messages and invalid codes when creating diagnostics', () => {
    expect(() => createDiagnostic({
      code: 'CONTRACTS_VALIDATION_FAILED',
      severity: 'error',
      message: '   '
    })).toThrow('message must not be empty');

    expect(() => createDiagnostic({
      code: 'contracts_validation_failed',
      severity: 'error',
      message: 'Invalid value.'
    })).toThrow('uppercase');
  });

  it('sanitizes diagnostic context before serialization', () => {
    const sanitized = sanitizeDiagnosticContext({
      apiKey: 'abc123',
      filePath: 'src/index.ts',
      nested: { unsafe: true },
      password: 'secret-password',
      retryDelays: [100, 200, Number.POSITIVE_INFINITY, 'later'],
      'unsafe key': 'not included',
      withUndefined: undefined
    });

    expect(sanitized).toEqual({
      apiKey: '[redacted]',
      filePath: 'src/index.ts',
      password: '[redacted]',
      retryDelays: [100, 200, 'later']
    });
  });

  it('narrows diagnostics with a runtime guard', () => {
    const diagnostic = createDiagnostic({
      code: CODESTELLATION_DIAGNOSTIC_CODES.validationFailed,
      severity: 'warning',
      message: 'Validation issue.',
      causeCode: CODESTELLATION_DIAGNOSTIC_CODES.invalidArgument,
      context: {
        field: 'sourceId'
      }
    });

    expect(isCodestellationDiagnostic(diagnostic)).toBe(true);
    expect(isCodestellationDiagnostic({ ...diagnostic, retryable: 'false' })).toBe(false);
    expect(isCodestellationDiagnostic({ ...diagnostic, context: { unsafe: { nested: true } } })).toBe(false);
  });

  it('returns defensive serializable diagnostic copies', () => {
    const diagnostic = createDiagnostic({
      code: 'PARSER_FILE_SKIPPED',
      severity: 'info',
      message: 'File skipped.',
      context: {
        token: 'must-not-leak',
        filePath: 'src/app.ts'
      }
    });

    expect(toSerializableDiagnostic(diagnostic)).toEqual({
      schemaVersion: CODESTELLATION_DIAGNOSTIC_SCHEMA_VERSION,
      code: 'PARSER_FILE_SKIPPED',
      severity: 'info',
      message: 'File skipped.',
      retryable: false,
      context: {
        filePath: 'src/app.ts',
        token: '[redacted]'
      }
    });
  });
});
