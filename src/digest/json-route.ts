import { Hono } from 'hono';
import { readNight } from './read-night.js';

const nightPattern = /^\d{4}-\d{2}-\d{2}$/;

export function createDigestJsonRoute(runsDir: string) {
  const route = new Hono();

  route.get('/:night', async (c) => {
    const night = c.req.param('night');
    if (!nightPattern.test(night)) {
      return c.json({ error: 'night not found' }, 404);
    }

    try {
      const { rows } = await readNight(runsDir, night);
      rows.sort((a, b) => a.job.localeCompare(b.job));
      return c.json(rows);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return c.json({ error: 'night not found' }, 404);
      }
      throw error;
    }
  });

  return route;
}
