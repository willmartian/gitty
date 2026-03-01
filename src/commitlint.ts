import load, { type QualifiedConfig } from '@commitlint/load';
import { CommitParser } from 'conventional-commits-parser';
import conventionalCommits from 'conventional-changelog-conventionalcommits';

export interface ConventionalCommit {
  type: string | null;
  scope: string | null;
  description: string | null;
  breaking: boolean;
}

let configCache: QualifiedConfig | null = null;
let parserCache: CommitParser | null = null;

async function getConfig(): Promise<QualifiedConfig | null> {
  if (configCache) return configCache;
  try {
    configCache = await load();
    return configCache;
  } catch {
    return null;
  }
}

/*
 * @commitlint/parse is incompatible with the class-based API introduced in
 * conventional-commits-parser v6. We bypass it and construct a CommitParser
 * directly using the conventional-changelog-conventionalcommits preset, which
 * includes the corrected headerPattern and breakingHeaderPattern regexes needed
 * to handle the `!` breaking change syntax required by the spec.
 * https://github.com/conventional-changelog/conventional-changelog/issues/648
 */
async function getParser(): Promise<CommitParser> {
  if (parserCache) return parserCache;
  const spec = await conventionalCommits();
  parserCache = new CommitParser(spec.parser);
  return parserCache;
}

export async function hasCommitlintConfig(): Promise<boolean> {
  const config = await getConfig();
  if (!config) return false;
  return (config.extends?.length ?? 0) > 0 || Object.keys(config.rules ?? {}).length > 0;
}

export async function parseConventional(subject: string): Promise<ConventionalCommit> {
  const parser = await getParser();
  const p = parser.parse(subject);
  const breaking = p.notes.some(n => n.title === 'BREAKING CHANGE');
  return { type: p.type ?? null, scope: p.scope ?? null, description: p.subject ?? null, breaking };
}
