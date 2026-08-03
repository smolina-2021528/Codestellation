import { describe, expect, it } from 'vitest';

import {
  GRAPH_PROVENANCE_SCHEMA_VERSION,
  assertGraphConfidence,
  assertGraphProvenance,
  assertGraphProvenanceRecord,
  isGraphConfidence,
  isGraphConfidenceLevel,
  isGraphProvenance,
  isGraphProvenanceEvidenceType,
  isGraphProvenanceRecord,
  isGraphProvenanceRecordType,
  toSerializableGraphConfidence,
  toSerializableGraphProvenance,
  toSerializableGraphProvenanceRecord,
  type GraphConfidence,
  type GraphProvenanceRecord
} from '../src/index.js';

const staticAnalysisRecord: GraphProvenanceRecord = {
  schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
  type: 'static-analysis',
  producer: {
    name: 'typescript-ast-analyzer',
    version: '0.0.0'
  },
  evidence: [
    {
      type: 'source-location',
      value: 'packages/graph-model/src/nodes.ts:1-20',
      label: 'node contract declaration'
    },
    {
      type: 'static-rule',
      value: 'exported-type-declaration'
    }
  ],
  observedAt: '2026-07-31T18:00:00.000Z'
};

describe('graph confidence metadata', () => {
  it('recognizes the supported confidence levels', () => {
    expect(isGraphConfidenceLevel('confirmed')).toBe(true);
    expect(isGraphConfidenceLevel('probable')).toBe(true);
    expect(isGraphConfidenceLevel('possible')).toBe(true);
    expect(isGraphConfidenceLevel('human-verified')).toBe(true);
    expect(isGraphConfidenceLevel('guessed')).toBe(false);
  });

  it('accepts serializable confidence metadata', () => {
    const confidence: GraphConfidence = {
      level: 'probable',
      score: 0.82,
      rationale: 'Framework evidence was inferred from configuration files.'
    };

    expect(isGraphConfidence(confidence)).toBe(true);
    expect(toSerializableGraphConfidence(confidence)).toEqual(confidence);
  });

  it('normalizes rationale text without changing the confidence level', () => {
    expect(toSerializableGraphConfidence({
      level: 'human-verified',
      rationale: ' Reviewed by architect '
    })).toEqual({
      level: 'human-verified',
      rationale: 'Reviewed by architect'
    });
  });

  it('rejects invalid score values', () => {
    expect(() => assertGraphConfidence({
      level: 'confirmed',
      score: -0.1
    })).toThrow(RangeError);

    expect(() => assertGraphConfidence({
      level: 'possible',
      score: Number.NaN
    })).toThrow(RangeError);

    expect(() => assertGraphConfidence({
      level: 'probable',
      score: 1.1
    })).toThrow(RangeError);
  });
});

describe('graph provenance metadata', () => {
  it('recognizes supported provenance record and evidence types', () => {
    expect(isGraphProvenanceRecordType('source-scan')).toBe(true);
    expect(isGraphProvenanceRecordType('human-annotation')).toBe(true);
    expect(isGraphProvenanceRecordType('runtime-execution')).toBe(false);

    expect(isGraphProvenanceEvidenceType('source-location')).toBe(true);
    expect(isGraphProvenanceEvidenceType('human-note')).toBe(true);
    expect(isGraphProvenanceEvidenceType('secret-token')).toBe(false);
  });

  it('accepts records with producer, type and evidence', () => {
    expect(isGraphProvenanceRecord(staticAnalysisRecord)).toBe(true);
    expect(toSerializableGraphProvenanceRecord(staticAnalysisRecord)).toEqual(staticAnalysisRecord);
  });

  it('requires at least one provenance record and one evidence item', () => {
    expect(() => assertGraphProvenance([])).toThrow(RangeError);

    expect(() => assertGraphProvenanceRecord({
      ...staticAnalysisRecord,
      evidence: []
    })).toThrow(RangeError);
  });

  it('normalizes records deterministically', () => {
    const humanRecord: GraphProvenanceRecord = {
      schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
      type: 'human-annotation',
      producer: {
        name: ' Architect Review '
      },
      evidence: [
        {
          type: 'human-note',
          value: ' Approved public API boundary '
        }
      ]
    };

    const normalized = toSerializableGraphProvenance([
      humanRecord,
      {
        ...staticAnalysisRecord,
        evidence: [...staticAnalysisRecord.evidence].reverse()
      }
    ]);

    expect(isGraphProvenance(normalized)).toBe(true);
    expect(normalized).toEqual([
      {
        schemaVersion: GRAPH_PROVENANCE_SCHEMA_VERSION,
        type: 'human-annotation',
        producer: {
          name: 'Architect Review'
        },
        evidence: [
          {
            type: 'human-note',
            value: 'Approved public API boundary'
          }
        ]
      },
      staticAnalysisRecord
    ]);
  });

  it('rejects invalid producer, evidence and timestamps', () => {
    expect(() => assertGraphProvenanceRecord({
      ...staticAnalysisRecord,
      producer: {
        name: ' '
      }
    })).toThrow(RangeError);

    expect(() => assertGraphProvenanceRecord({
      ...staticAnalysisRecord,
      evidence: [
        {
          type: 'source-location',
          value: ' '
        }
      ]
    })).toThrow(RangeError);

    expect(() => assertGraphProvenanceRecord({
      ...staticAnalysisRecord,
      observedAt: 'not-a-timestamp'
    })).toThrow(RangeError);
  });
});
