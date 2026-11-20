import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const night = '2026-11-19';

describe('digest routes', () => {
  let runsDir: string | undefined;

  beforeEach(async () => {
    runsDir = await mkdtemp(join(tmpdir(), 'rig-digest-routes-'));
  });

  afterEach(async () => {
    if (runsDir !== undefined) await rm(runsDir, { recursive: true, force: true });
  });

  function app() {
    if (runsDir === undefined) throw new Error('temporary runs directory is not set up');

    return createApp({
      adapter: 'test',
      installed: '2026-11-19T00:00:00Z',
      beatEverySeconds: 60,
      runsDir,
    });
  }

  async function writeNight(contents: string) {
    if (runsDir === undefined) throw new Error('temporary runs directory is not set up');

    await writeFile(join(runsDir, `${night}.jsonl`), contents);
  }

  function jobsInPage(html: string): string[] {
    const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
    if (tbody === undefined) return [];

    return Array.from(tbody.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g), ([, job]) => job ?? '');
  }

  it('serves the same sorted jobs in the HTML page and JSON API', async () => {
    await writeNight(
      [
        JSON.stringify({ at: '2026-11-19T02:00:00Z', job: 'zeta', status: 'ok', owner: 'Sam' }),
        JSON.stringify({ at: '2026-11-19T01:00:00Z', job: 'alpha', status: 'fail', owner: null }),
      ].join('\n'),
    );

    const pageResponse = await app().request(`/digest/${night}`);
    const page = await pageResponse.text();
    const jsonResponse = await app().request(`/api/digest/${night}`);
    const rows: { job: string }[] = await jsonResponse.json();

    expect(pageResponse.status).toBe(200);
    expect(jsonResponse.status).toBe(200);
    expect(page).toContain('<table>');
    expect(rows.map((row) => row.job)).toEqual(['alpha', 'zeta']);
    expect(jobsInPage(page)).toEqual(rows.map((row) => row.job));
  });

  it('returns 404 from both routes when the night is missing', async () => {
    const pageResponse = await app().request(`/digest/${night}`);
    const jsonResponse = await app().request(`/api/digest/${night}`);

    expect(pageResponse.status).toBe(404);
    expect(jsonResponse.status).toBe(404);
  });

  it('renders an empty night and returns an empty JSON array', async () => {
    await writeNight('');

    const pageResponse = await app().request(`/digest/${night}`);
    const page = await pageResponse.text();
    const jsonResponse = await app().request(`/api/digest/${night}`);

    expect(pageResponse.status).toBe(200);
    expect(page).toContain('nothing ran');
    expect(jsonResponse.status).toBe(200);
    expect(await jsonResponse.json()).toEqual([]);
  });

  it('keeps valid rows when the night contains a malformed line', async () => {
    await writeNight(
      [
        JSON.stringify({ at: '2026-11-19T02:00:00Z', job: 'valid-job', status: 'ok', owner: 'Sam' }),
        '{malformed json',
      ].join('\n'),
    );

    const pageResponse = await app().request(`/digest/${night}`);
    const page = await pageResponse.text();
    const jsonResponse = await app().request(`/api/digest/${night}`);
    const rows: { job: string }[] = await jsonResponse.json();

    expect(pageResponse.status).toBe(200);
    expect(jobsInPage(page)).toEqual(['valid-job']);
    expect(jsonResponse.status).toBe(200);
    expect(rows.map((row) => row.job)).toEqual(['valid-job']);
  });
});
