import { Hono } from 'hono';
import { readNight } from '../digest/read-night.js';
import type { NightDigest } from '../digest/types.js';
import { lane } from '../lane.js';
import { Layout } from '../views/layout.js';
import { DigestPage } from '../views/digest.js';

const nightPattern = /^\d{4}-\d{2}-\d{2}$/;

export function createDigestPageRoute(runsDir: string) {
  const route = new Hono();

  route.get('/:night', async (c) => {
    const night = c.req.param('night');
    if (!nightPattern.test(night)) return c.notFound();

    let digest: NightDigest;
    try {
      digest = await readNight(runsDir, night);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return c.notFound();
      }
      throw error;
    }

    const rows = [...digest.rows].sort((left, right) => left.job.localeCompare(right.job));
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={night} rows={rows} />
      </Layout>,
    );
  });

  return route;
}
