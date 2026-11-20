export type RunStatus = 'ok' | 'retry' | 'fail';

export interface DigestRow {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  status: RunStatus;
  error: string | null;
  firstAt: string;
  lastAt: string;
}

export interface NightDigest {
  rows: DigestRow[];
  malformedLines: number;
}

export type ReadNight = (runsDir: string, night: string) => Promise<NightDigest>;
