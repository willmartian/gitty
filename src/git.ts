import simpleGit from 'simple-git';

const git = simpleGit();

export type XY = ' ' | 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?';

export interface GitFile {
  x: XY;
  y: XY;
  path: string;
  origPath?: string;
}

export interface RepoInfo {
  branch: string;
  detached: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
}

export async function getRepoInfo(): Promise<RepoInfo> {
  const s = await git.status();
  return {
    branch: s.current ?? 'HEAD',
    detached: s.detached,
    upstream: s.tracking ?? undefined,
    ahead: s.ahead,
    behind: s.behind,
  };
}

export async function getStatus(): Promise<{ changes: GitFile[]; staged: GitFile[] }> {
  const s = await git.status();
  const changes: GitFile[] = [];
  const staged: GitFile[] = [];

  for (const f of s.files) {
    const x = (f.index || ' ') as XY;
    const y = (f.working_dir || ' ') as XY;
    const file: GitFile = f.from
      ? { x, y, path: f.path, origPath: f.from }
      : { x, y, path: f.path };

    const untracked = x === '?' && y === '?';
    if (!untracked && x !== ' ') staged.push(file);
    if (y !== ' ' || untracked) changes.push(file);
  }

  return { changes, staged };
}

export async function stage(path: string) {
  await git.add(path);
}

export async function stageAll() {
  await git.raw(['add', '-A']);
}

// `git restore --staged` requires a HEAD commit. In a brand-new repo (no commits
// yet) it exits 128 with "fatal: could not resolve HEAD". Fall back to
// `git rm --cached` only for that specific case; all other errors surface as-is.
export async function unstage(path: string) {
  try {
    await git.raw(['restore', '--staged', '--', path]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('could not resolve HEAD')) {
      await git.raw(['rm', '--cached', '--', path]);
    } else {
      throw e;
    }
  }
}

export async function unstageAll() {
  try {
    await git.raw(['restore', '--staged', '.']);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('could not resolve HEAD')) {
      await git.raw(['rm', '--cached', '-r', '.']);
    } else {
      throw e;
    }
  }
}

export interface Branch {
  name: string;
  current: boolean;
  hash: string;
  subject: string;
  upstream?: string;
  ahead: number;
  behind: number;
  gone: boolean;
}

// Use | as field separator; re-join the tail to handle | in commit subjects.
export async function getBranches(): Promise<Branch[]> {
  const fmt = '%(HEAD)|%(refname:short)|%(upstream:short)|%(upstream:track)|%(objectname:short)|%(subject)';
  const raw = await git.raw(['for-each-ref', `--format=${fmt}`, '--sort=-committerdate', 'refs/heads']);

  return raw.split('\n').filter(Boolean).map(line => {
    const [head, name, upstream, track, hash, ...rest] = line.split('|');
    const subject = rest.join('|');
    const ahead = Number(track?.match(/ahead (\d+)/)?.[1] ?? 0);
    const behind = Number(track?.match(/behind (\d+)/)?.[1] ?? 0);
    const gone = track?.includes('gone') ?? false;
    return {
      name: name ?? '',
      current: head === '*',
      hash: hash ?? '',
      subject: subject ?? '',
      upstream: upstream || undefined,
      ahead,
      behind,
      gone,
    };
  });
}

export async function checkoutBranch(name: string) {
  await git.checkout(name);
}

export async function deleteBranch(name: string, force = false) {
  await git.deleteLocalBranch(name, force);
}

export interface Stash {
  index: number;
  ref: string;    // "stash@{0}"
  hash: string;
  branch: string;
  message: string;
  date: string;   // relative date e.g. "2 hours ago"
}

// git stash list uses git-log format specifiers.
// %gd = reflog selector (stash@{n}), %h = short hash, %cr = relative date, %gs = reflog subject
export async function getStashes(): Promise<Stash[]> {
  const raw = await git.raw(['stash', 'list', '--format=%gd|%h|%cr|%gs']);
  return raw.split('\n').filter(Boolean).map((line, i) => {
    const parts = line.split('|');
    const ref = parts[0] ?? '';
    const hash = parts[1] ?? '';
    const date = parts[2] ?? '';
    const gs = parts.slice(3).join('|');

    let branch = '';
    let message = gs;
    const wipMatch = gs.match(/^WIP on ([^:]+): (.+)$/);
    const onMatch = gs.match(/^On ([^:]+): (.+)$/);
    if (wipMatch) { branch = wipMatch[1]!; message = wipMatch[2]!; }
    else if (onMatch) { branch = onMatch[1]!; message = onMatch[2]!; }

    return { index: i, ref, hash, branch, message, date };
  });
}

export async function stashPush() {
  await git.stash();
}

export async function stashPop(ref: string) {
  await git.stash(['pop', ref]);
}

export async function stashApply(ref: string) {
  await git.stash(['apply', ref]);
}

export async function stashDrop(ref: string) {
  await git.stash(['drop', ref]);
}

export async function commit(message: string) {
  await git.commit(message);
}

export async function push() {
  await git.push();
}

export async function pull() {
  await git.pull();
}

export async function discard(file: GitFile) {
  if (file.x === '?' && file.y === '?') {
    await git.raw(['clean', '-f', '--', file.path]);
  } else {
    await git.checkout(['--', file.path]);
  }
}
