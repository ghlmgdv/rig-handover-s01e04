import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read-night.js';

describe('readNight', () => {
  it('reads the fixture into five jobs and counts its malformed line', async () => {
    const result = await readNight('runs', '2026-10-28');

    expect(result.rows).toHaveLength(5);
    expect(result.malformedLines).toBe(1);

    const byJob = new Map(result.rows.map((row) => [row.job, row]));
    expect([...byJob.keys()].sort()).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(byJob.get('digest/render')?.owner).toBeNull();
    expect(byJob.get('fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      status: 'ok',
      error: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });
});
