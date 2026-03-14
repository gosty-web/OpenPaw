import type { CronScheduler } from './CronScheduler.js';

let scheduler: CronScheduler | null = null;

export function setCronScheduler(instance: CronScheduler) {
  scheduler = instance;
}

export function getCronScheduler(): CronScheduler | null {
  return scheduler;
}
