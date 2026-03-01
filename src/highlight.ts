import { createHighlighter, type BundledLanguage } from 'shiki';

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

let highlighter: Highlighter | null = null;
const loadedLangs = new Set<string>(['diff']);

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['diff'] });
  }
  return highlighter;
}

const BG_ADD:    [number, number, number] = [16, 52, 16];
const BG_REMOVE: [number, number, number] = [52, 16, 16];

function renderToken(text: string, fgHex: string | undefined, bg: [number, number, number] | null): string {
  if (!bg && !fgHex) return text;
  const bgPart = bg ? `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m` : '';
  let fgPart = '';
  if (fgHex) {
    const n = parseInt(fgHex.replace('#', ''), 16);
    fgPart = `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
  }
  return `${bgPart}${fgPart}${text}\x1b[0m`;
}

const EXT_LANG: Record<string, BundledLanguage> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java',
  css: 'css', html: 'html', json: 'json', md: 'markdown',
  sh: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'toml',
  c: 'c', cpp: 'cpp',
};

function detectLang(diff: string): BundledLanguage | 'diff' {
  const match = diff.match(/^\+\+\+ b\/(.+)$/m);
  if (!match) return 'diff';
  const ext = match[1]!.split('.').pop() ?? '';
  return EXT_LANG[ext] ?? 'diff';
}

interface LineInfo {
  skip: boolean;
  lineNo: number;
  bg: [number, number, number] | null;
}

function parseLineInfos(rawLines: string[]): LineInfo[] {
  let oldLine = 0;
  let newLine = 0;

  return rawLines.map(raw => {
    if (raw.startsWith('diff --git ') || raw.startsWith('index ') || raw.startsWith('--- ') || raw.startsWith('+++ ')) {
      return { skip: true, lineNo: 0, bg: null };
    }
    if (raw.startsWith('@@')) {
      const m = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) { oldLine = parseInt(m[1]!) - 1; newLine = parseInt(m[2]!) - 1; }
      return { skip: true, lineNo: 0, bg: null };
    }
    if (raw.startsWith('+')) {
      return { skip: false, lineNo: ++newLine, bg: BG_ADD };
    }
    if (raw.startsWith('-')) {
      return { skip: false, lineNo: ++oldLine, bg: BG_REMOVE };
    }
    oldLine++; newLine++;
    return { skip: false, lineNo: newLine, bg: null };
  });
}

export async function highlightDiff(diff: string): Promise<string[]> {
  const hl = await getHighlighter();
  const rawLines = diff.split('\n');
  const lineInfos = parseLineInfos(rawLines);

  const maxLineNo = Math.max(...lineInfos.map(l => l.lineNo));
  const numWidth = String(maxLineNo).length;

  const lang = detectLang(diff);
  if (lang !== 'diff' && !loadedLangs.has(lang)) {
    try {
      await hl.loadLanguage(lang);
      loadedLangs.add(lang);
    } catch {
      // unsupported language, fall through to diff
    }
  }

  const tokenLines = hl.codeToTokensBase(diff, {
    lang: loadedLangs.has(lang) ? lang : 'diff',
    theme: 'github-dark',
  });

  return tokenLines
    .map((lineTokens, i) => {
      const info = lineInfos[i];
      if (!info || info.skip) return null;

      const { lineNo, bg } = info;
      const num = String(lineNo).padStart(numWidth);
      const gutter = bg
        ? `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m\x1b[2m${num}\x1b[22m `
        : `\x1b[2m${num}\x1b[22m `;

      const content = lineTokens.map(t => renderToken(t.content, t.color, bg)).join('');
      const trail = bg ? `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m\x1b[K\x1b[0m` : '';

      return gutter + content + trail;
    })
    .filter((l): l is string => l !== null);
}
