export const GRAPH_CONFIDENCE_LEVELS = [
  'confirmed',
  'probable',
  'possible',
  'human-verified'
] as const;

export type GraphConfidenceLevel = typeof GRAPH_CONFIDENCE_LEVELS[number];

export const GRAPH_PROVENANCE_SCHEMA_VERSION = 1 as const;

export const GRAPH_PROVENANCE_RECORD_TYPES = [
  'source-scan',
  'static-analysis',
  'semantic-analysis',
  'framework-detection',
  'human-annotation',
  'external-import'
] as const;

export type GraphProvenanceRecordType = typeof GRAPH_PROVENANCE_RECORD_TYPES[number];

export const GRAPH_PROVENANCE_EVIDENCE_TYPES = [
  'source-location',
  'manifest',
  'static-rule',
  'heuristic',
  'semantic-summary',
  'human-note',
  'external-reference'
] as const;

export type GraphProvenanceEvidenceType = typeof GRAPH_PROVENANCE_EVIDENCE_TYPES[number];

export interface GraphConfidence {
  readonly level: GraphConfidenceLevel;
  readonly score?: number;
  readonly rationale?: string;
}

export interface GraphProvenanceProducer {
  readonly name: string;
  readonly version?: string;
}

export interface GraphProvenanceEvidence {
  readonly type: GraphProvenanceEvidenceType;
  readonly value: string;
  readonly label?: string;
}

export interface GraphProvenanceRecord {
  readonly schemaVersion: typeof GRAPH_PROVENANCE_SCHEMA_VERSION;
  readonly type: GraphProvenanceRecordType;
  readonly producer: GraphProvenanceProducer;
  readonly evidence: readonly GraphProvenanceEvidence[];
  readonly observedAt?: string;
}

const GRAPH_PROVENANCE_TEXT_MAX_LENGTH = 240;
const GRAPH_PROVENANCE_RATIONALE_MAX_LENGTH = 1200;
const GRAPH_PROVENANCE_EVIDENCE_VALUE_MAX_LENGTH = 2000;
const GRAPH_PROVENANCE_EVIDENCE_MAX_ITEMS = 40;
const GRAPH_PROVENANCE_RECORD_MAX_ITEMS = 80;

export function isGraphConfidenceLevel(value: unknown): value is GraphConfidenceLevel {
  return typeof value === 'string'
    && GRAPH_CONFIDENCE_LEVELS.includes(value as GraphConfidenceLevel);
}

export function isGraphProvenanceRecordType(value: unknown): value is GraphProvenanceRecordType {
  return typeof value === 'string'
    && GRAPH_PROVENANCE_RECORD_TYPES.includes(value as GraphProvenanceRecordType);
}

export function isGraphProvenanceEvidenceType(value: unknown): value is GraphProvenanceEvidenceType {
  return typeof value === 'string'
    && GRAPH_PROVENANCE_EVIDENCE_TYPES.includes(value as GraphProvenanceEvidenceType);
}

export function isGraphConfidence(value: unknown): value is GraphConfidence {
  try {
    assertGraphConfidence(value);
    return true;
  } catch {
    return false;
  }
}

export function isGraphProvenanceRecord(value: unknown): value is GraphProvenanceRecord {
  try {
    assertGraphProvenanceRecord(value);
    return true;
  } catch {
    return false;
  }
}

export function isGraphProvenance(value: unknown): value is readonly GraphProvenanceRecord[] {
  try {
    assertGraphProvenance(value);
    return true;
  } catch {
    return false;
  }
}

export function assertGraphConfidence(value: unknown): asserts value is GraphConfidence {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph confidence must be an object.');
  }

  const confidence = value as Partial<GraphConfidence>;

  if (!isGraphConfidenceLevel(confidence.level)) {
    throw new RangeError('Graph confidence level is invalid.');
  }

  if (confidence.score !== undefined && !isConfidenceScore(confidence.score)) {
    throw new RangeError('Graph confidence score must be a finite number between 0 and 1.');
  }

  if (confidence.rationale !== undefined) {
    normalizeText(confidence.rationale, 'confidence.rationale', GRAPH_PROVENANCE_RATIONALE_MAX_LENGTH);
  }
}

export function assertGraphProvenance(value: unknown): asserts value is readonly GraphProvenanceRecord[] {
  if (!Array.isArray(value)) {
    throw new RangeError('Graph provenance must be an array.');
  }

  if (value.length === 0) {
    throw new RangeError('Graph provenance must include at least one record.');
  }

  if (value.length > GRAPH_PROVENANCE_RECORD_MAX_ITEMS) {
    throw new RangeError('Graph provenance has too many records.');
  }

  for (const record of value) {
    assertGraphProvenanceRecord(record);
  }
}

export function assertGraphProvenanceRecord(value: unknown): asserts value is GraphProvenanceRecord {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph provenance record must be an object.');
  }

  const record = value as Partial<GraphProvenanceRecord>;

  if (record.schemaVersion !== GRAPH_PROVENANCE_SCHEMA_VERSION) {
    throw new RangeError('Unsupported graph provenance schema version.');
  }

  if (!isGraphProvenanceRecordType(record.type)) {
    throw new RangeError('Graph provenance record type is invalid.');
  }

  assertGraphProvenanceProducer(record.producer);

  if (!Array.isArray(record.evidence)) {
    throw new RangeError('Graph provenance evidence must be an array.');
  }

  if (record.evidence.length === 0) {
    throw new RangeError('Graph provenance evidence must include at least one item.');
  }

  if (record.evidence.length > GRAPH_PROVENANCE_EVIDENCE_MAX_ITEMS) {
    throw new RangeError('Graph provenance evidence has too many items.');
  }

  for (const evidence of record.evidence) {
    assertGraphProvenanceEvidence(evidence);
  }

  if (record.observedAt !== undefined) {
    normalizeObservedAt(record.observedAt);
  }
}

export function toSerializableGraphConfidence(confidence: GraphConfidence): GraphConfidence {
  assertGraphConfidence(confidence);

  const base = {
    level: confidence.level
  };

  return withOptionalRationale(
    withOptionalScore(base, confidence.score),
    confidence.rationale
  );
}

export function toSerializableGraphProvenance(
  provenance: readonly GraphProvenanceRecord[]
): readonly GraphProvenanceRecord[] {
  assertGraphProvenance(provenance);
  return [...provenance].map(toSerializableGraphProvenanceRecord).sort(compareProvenanceRecords);
}

export function toSerializableGraphProvenanceRecord(record: GraphProvenanceRecord): GraphProvenanceRecord {
  assertGraphProvenanceRecord(record);

  const base = {
    schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
    type: record.type,
    producer: toSerializableGraphProvenanceProducer(record.producer),
    evidence: [...record.evidence].map(toSerializableGraphProvenanceEvidence).sort(compareEvidence)
  };

  return record.observedAt === undefined
    ? base
    : { ...base, observedAt: normalizeObservedAt(record.observedAt) };
}

function assertGraphProvenanceProducer(value: unknown): asserts value is GraphProvenanceProducer {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph provenance producer must be an object.');
  }

  const producer = value as Partial<GraphProvenanceProducer>;

  normalizeText(producer.name, 'provenance.producer.name', GRAPH_PROVENANCE_TEXT_MAX_LENGTH);

  if (producer.version !== undefined) {
    normalizeText(producer.version, 'provenance.producer.version', GRAPH_PROVENANCE_TEXT_MAX_LENGTH);
  }
}

function assertGraphProvenanceEvidence(value: unknown): asserts value is GraphProvenanceEvidence {
  if (!value || typeof value !== 'object') {
    throw new RangeError('Graph provenance evidence must be an object.');
  }

  const evidence = value as Partial<GraphProvenanceEvidence>;

  if (!isGraphProvenanceEvidenceType(evidence.type)) {
    throw new RangeError('Graph provenance evidence type is invalid.');
  }

  normalizeText(evidence.value, 'provenance.evidence.value', GRAPH_PROVENANCE_EVIDENCE_VALUE_MAX_LENGTH);

  if (evidence.label !== undefined) {
    normalizeText(evidence.label, 'provenance.evidence.label', GRAPH_PROVENANCE_TEXT_MAX_LENGTH);
  }
}

function toSerializableGraphProvenanceProducer(
  producer: GraphProvenanceProducer
): GraphProvenanceProducer {
  assertGraphProvenanceProducer(producer);

  const base = {
    name: normalizeText(producer.name, 'provenance.producer.name', GRAPH_PROVENANCE_TEXT_MAX_LENGTH)
  };

  return producer.version === undefined
    ? base
    : {
        ...base,
        version: normalizeText(
          producer.version,
          'provenance.producer.version',
          GRAPH_PROVENANCE_TEXT_MAX_LENGTH
        )
      };
}

function toSerializableGraphProvenanceEvidence(evidence: GraphProvenanceEvidence): GraphProvenanceEvidence {
  assertGraphProvenanceEvidence(evidence);

  const base = {
    type: evidence.type,
    value: normalizeText(
      evidence.value,
      'provenance.evidence.value',
      GRAPH_PROVENANCE_EVIDENCE_VALUE_MAX_LENGTH
    )
  };

  return evidence.label === undefined
    ? base
    : {
        ...base,
        label: normalizeText(
          evidence.label,
          'provenance.evidence.label',
          GRAPH_PROVENANCE_TEXT_MAX_LENGTH
        )
      };
}

function withOptionalScore<T extends { readonly level: GraphConfidenceLevel }>(
  base: T,
  score: number | undefined
): T | T & { readonly score: number } {
  return score === undefined ? base : { ...base, score };
}

function withOptionalRationale<T extends GraphConfidence>(
  base: T,
  rationale: string | undefined
): T | T & { readonly rationale: string } {
  return rationale === undefined
    ? base
    : {
        ...base,
        rationale: normalizeText(
          rationale,
          'confidence.rationale',
          GRAPH_PROVENANCE_RATIONALE_MAX_LENGTH
        )
      };
}

function compareProvenanceRecords(left: GraphProvenanceRecord, right: GraphProvenanceRecord): number {
  return provenanceRecordKey(left).localeCompare(provenanceRecordKey(right));
}

function compareEvidence(left: GraphProvenanceEvidence, right: GraphProvenanceEvidence): number {
  return evidenceKey(left).localeCompare(evidenceKey(right));
}

function provenanceRecordKey(record: GraphProvenanceRecord): string {
  return [
    record.type,
    record.producer.name,
    record.producer.version ?? '',
    record.observedAt ?? '',
    record.evidence.map(evidenceKey).join('\u0000')
  ].join('\u0000');
}

function evidenceKey(evidence: GraphProvenanceEvidence): string {
  return [evidence.type, evidence.value, evidence.label ?? ''].join('\u0000');
}

function isConfidenceScore(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1;
}

function normalizeObservedAt(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RangeError('Graph provenance observedAt must be a string.');
  }

  const normalized = value.trim();
  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    throw new RangeError('Graph provenance observedAt must be a valid timestamp.');
  }

  return new Date(timestamp).toISOString();
}

function normalizeText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new RangeError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${fieldName} must not be empty.`);
  }

  if (normalized.length > maxLength) {
    throw new RangeError(`${fieldName} is too long.`);
  }

  return normalized;
}
