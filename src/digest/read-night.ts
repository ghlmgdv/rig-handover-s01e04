import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus } from './types.js';

interface RunRecord {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
}

const statuses = new Set<RunStatus>(['ok', 'retry', 'fail']);

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'string' &&
    record.at.length > 0 &&
    typeof record.job === 'string' &&
    record.job.length > 0 &&
    typeof record.status === 'string' &&
    statuses.has(record.status as RunStatus) &&
    (typeof record.owner === 'string' || record.owner === null) &&
    (record.error === undefined || typeof record.error === 'string')
  );
}

function parseLine(line: string): RunRecord | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return isRunRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export const readNight: ReadNight = async (runsDir, night): Promise<NightDigest> => {
  const content = await readFile(join(runsDir, `${night}.jsonl`), 'utf8');
  if (content.length === 0) return { rows: [], malformedLines: 0 };

  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rows = new Map<string, DigestRow>();
  let malformedLines = 0;

  for (const line of lines) {
    const record = parseLine(line);
    if (!record) {
      malformedLines += 1;
      continue;
    }

    const previous = rows.get(record.job);
    rows.set(record.job, {
      job: record.job,
      owner: record.owner,
      runs: (previous?.runs ?? 0) + 1,
      retries: (previous?.retries ?? 0) + (record.status === 'retry' ? 1 : 0),
      status: record.status,
      error: record.error ?? previous?.error ?? null,
      firstAt: previous?.firstAt ?? record.at,
      lastAt: record.at,
    });
  }

  return { rows: [...rows.values()], malformedLines };
};
