import { pushLog, type LogEntry } from '../activityLog.ts';

export function useLog() {
  return pushLog;
}
