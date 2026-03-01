export type LogEntry = {
  action: string;
  detail: string;
};

const entries: LogEntry[] = [];

export function pushLog(entry: LogEntry) {
  entries.push(entry);
}

export function getLog(): readonly LogEntry[] {
  return entries;
}
