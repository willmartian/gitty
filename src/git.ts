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

// Bun's ShellError has a `.stderr` buffer with the actual git message.
// Extract it so callers see e.g. "fatal: not a git repository" instead of
// "Command exited with code 128".
function gitError(e: unknown): Error {
  if (e != null && typeof e === 'object' && 'stderr' in e) {
    const raw = (e as { stderr: unknown }).stderr;
    const text = raw instanceof Uint8Array
      ? new TextDecoder().decode(raw).trim()
      : typeof raw === 'string' ? raw.trim() : '';
    if (text) return new Error(text);
  }
  return e instanceof Error ? e : new Error(String(e));
}

// `git status --branch --porcelain=v2` emits structured header lines:
//   # branch.head <name>          (or "(detached)" if detached HEAD)
//   # branch.upstream <upstream>  (only if tracking)
//   # branch.ab +<ahead> -<behind>(only if tracking)
export async function getRepoInfo(): Promise<RepoInfo> {
  try {
    const raw = await Bun.$`git status --branch --porcelain=v2`.text();
    let branch = 'HEAD';
    let detached = false;
    let upstream: string | undefined;
    let ahead = 0;
    let behind = 0;

    for (const line of raw.split('\n')) {
      if (line.startsWith('# branch.head ')) {
        branch = line.slice('# branch.head '.length);
        detached = branch === '(detached)';
      } else if (line.startsWith('# branch.upstream ')) {
        upstream = line.slice('# branch.upstream '.length);
      } else if (line.startsWith('# branch.ab ')) {
        const m = line.slice('# branch.ab '.length).match(/\+(\d+) -(\d+)/);
        if (m) { ahead = Number(m[1]); behind = Number(m[2]); }
      }
    }

    return { branch, detached, upstream, ahead, behind };
  } catch (e) {
    throw gitError(e);
  }
}

export async function getStatus(): Promise<{ changes: GitFile[]; staged: GitFile[] }> {
  let raw: string;
  try {
    raw = await Bun.$`git status --porcelain`.text();
  } catch (e) {
    throw gitError(e);
  }

  const changes: GitFile[] = [];
  const staged: GitFile[] = [];

  for (const line of raw.split('\n').filter(Boolean)) {
    const x = line.charAt(0) as XY;
    const y = line.charAt(1) as XY;
    const rest = line.slice(3);
    const arrowIdx = rest.indexOf(' -> ');
    const file: GitFile = arrowIdx >= 0
      ? { x, y, path: rest.slice(arrowIdx + 4), origPath: rest.slice(0, arrowIdx) }
      : { x, y, path: rest };

    const untracked = x === '?' && y === '?';
    if (!untracked && x !== ' ') staged.push(file);
    if (y !== ' ' || untracked) changes.push(file);
  }

  return { changes, staged };
}

export async function stage(path: string) {
  try {
    await Bun.$`git add -- ${path}`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function stageAll() {
  try {
    await Bun.$`git add -A`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

// `git restore --staged` requires a HEAD commit. In a brand-new repo (no commits
// yet) it exits 128 with "fatal: could not resolve HEAD". Fall back to
// `git rm --cached` only for that specific case; all other errors surface as-is.
export async function unstage(path: string) {
  try {
    await Bun.$`git restore --staged -- ${path}`.quiet();
  } catch (e) {
    const err = gitError(e);
    if (err.message.includes('could not resolve HEAD')) {
      try {
        await Bun.$`git rm --cached -- ${path}`.quiet();
      } catch (e2) {
        throw gitError(e2);
      }
    } else {
      throw err;
    }
  }
}

export async function unstageAll() {
  try {
    await Bun.$`git restore --staged .`.quiet();
  } catch (e) {
    const err = gitError(e);
    if (err.message.includes('could not resolve HEAD')) {
      try {
        await Bun.$`git rm --cached -r .`.quiet();
      } catch (e2) {
        throw gitError(e2);
      }
    } else {
      throw err;
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
  gone: boolean; // upstream was deleted
}

// Use | as field separator; re-join the tail to handle | in commit subjects.
export async function getBranches(): Promise<Branch[]> {
  try {
    const fmt = '%(HEAD)|%(refname:short)|%(upstream:short)|%(upstream:track)|%(objectname:short)|%(subject)';
    const raw = await Bun.$`git for-each-ref --format=${fmt} --sort=-committerdate refs/heads`.text();

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
  } catch (e) {
    throw gitError(e);
  }
}

export async function checkoutBranch(name: string) {
  try {
    await Bun.$`git checkout ${name}`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function deleteBranch(name: string, force = false) {
  try {
    if (force) {
      await Bun.$`git branch -D ${name}`.quiet();
    } else {
      await Bun.$`git branch -d ${name}`.quiet();
    }
  } catch (e) {
    throw gitError(e);
  }
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
  try {
    const fmt = '%gd|%h|%cr|%gs';
    const raw = await Bun.$`git stash list --format=${fmt}`.text();
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
  } catch (e) {
    throw gitError(e);
  }
}

export async function stashPush() {
  try {
    await Bun.$`git stash push`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function stashPop(ref: string) {
  try {
    await Bun.$`git stash pop ${ref}`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function stashApply(ref: string) {
  try {
    await Bun.$`git stash apply ${ref}`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function stashDrop(ref: string) {
  try {
    await Bun.$`git stash drop ${ref}`.quiet();
  } catch (e) {
    throw gitError(e);
  }
}

export async function discard(file: GitFile) {
  try {
    if (file.x === '?' && file.y === '?') {
      await Bun.$`git clean -f -- ${file.path}`.quiet();
    } else {
      await Bun.$`git restore -- ${file.path}`.quiet();
    }
  } catch (e) {
    throw gitError(e);
  }
}
