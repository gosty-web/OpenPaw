declare module 'node-cron/src/time-matcher.js' {
  export default class TimeMatcher {
    constructor(pattern: string, timezone?: string);
    match(date: Date): boolean;
    apply(date: Date): Date;
  }
}
