import cron, { type ScheduledTask } from 'node-cron';
import TimeMatcher from 'node-cron/src/time-matcher.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { Server as SocketServer } from 'socket.io';

export interface CronJobRecord {
  id: string;
  agent_id: string;
  name: string;
  schedule: string;
  prompt: string;
  enabled: number;
  timezone: string;
  last_run?: string;
  next_run?: string;
  last_result?: string;
}

export class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private io?: SocketServer;

  constructor(io?: SocketServer) {
    this.io = io;
  }

  start(): void {
    const db = getDb();
    const enabledJobs = db.prepare('SELECT * FROM cron_jobs WHERE enabled = 1').all() as CronJobRecord[];
    
    console.log(`[Cron] Starting scheduler with ${enabledJobs.length} jobs`);
    
    for (const job of enabledJobs) {
      this.scheduleJob(job);
    }

    this.scheduleHeartbeats();
  }

  scheduleJob(cronJob: CronJobRecord): void {
    if (this.jobs.has(cronJob.id)) {
      this.unscheduleJob(cronJob.id);
    }

    const timezone = cronJob.timezone || 'UTC';
    const task = cron.schedule(cronJob.schedule, async () => {
      console.log(`[Cron] Triggering job: ${cronJob.name} (${cronJob.id})`);
      await this.runJob(cronJob.id);
    }, { timezone });

    this.jobs.set(cronJob.id, task);

    const nextRun = this.calculateNextRun(cronJob.schedule, timezone);
    if (nextRun) {
      const db = getDb();
      db.prepare('UPDATE cron_jobs SET next_run = ? WHERE id = ?').run(nextRun, cronJob.id);
    }
  }

  unscheduleJob(jobId: string): void {
    const task = this.jobs.get(jobId);
    if (task) {
      task.stop();
      this.jobs.delete(jobId);
    }
    const db = getDb();
    db.prepare('UPDATE cron_jobs SET next_run = NULL WHERE id = ?').run(jobId);
  }

  rescheduleJob(jobId: string): void {
    const db = getDb();
    const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(jobId) as CronJobRecord | undefined;
    if (!job) return;
    if (job.enabled === 1) {
      this.scheduleJob(job);
    } else {
      this.unscheduleJob(jobId);
    }
  }

  async runNow(jobId: string): Promise<string> {
    return await this.runJob(jobId);
  }

  private async runJob(jobId: string): Promise<string> {
    const db = getDb();
    const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(jobId) as CronJobRecord;
    if (!job) throw new Error('Job not found');

    const agentId = job.agent_id;
    const timezone = job.timezone || 'UTC';
    const engine = new AgentEngine(agentId);
    const instanceId = uuidv4();
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    // 1. Create instance record
    db.prepare('INSERT INTO instances (id, agent_id, type, status, started_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(instanceId, agentId, 'cron-job', 'running', startedAt, JSON.stringify({ jobId }));

    try {
      // 2. Run agent chat
      const result = await engine.chat(job.prompt, `cron-${jobId}`);
      const duration = Date.now() - startTime;
      const completedAt = new Date().toISOString();
      const nextRun = this.calculateNextRun(job.schedule, timezone);

      // 3. Update job record
      db.prepare('UPDATE cron_jobs SET last_run = ?, last_result = ?, next_run = ? WHERE id = ?')
        .run(completedAt, result.response, nextRun, jobId);

      // 4. Update instance record
      db.prepare('UPDATE instances SET status = ?, ended_at = ? WHERE id = ?')
        .run('idle', completedAt, instanceId);

      // 5. Log
      db.prepare('INSERT INTO instance_logs (id, instance_id, level, message, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), instanceId, 'info', `Cron job "${job.name}" completed successfully.`, completedAt);

      // 6. Emit event
      if (this.io) {
        this.io.emit('cron:complete', { jobId, result: result.response, duration });
        this.io.to('instances').emit('instance:log', { 
          instanceId, 
          level: 'info', 
          message: `Job ${job.name} done`, 
          timestamp: completedAt 
        });
      }

      return result.response;
    } catch (err: any) {
      const failedAt = new Date().toISOString();
      const nextRun = this.calculateNextRun(job.schedule, timezone);
      db.prepare('UPDATE cron_jobs SET last_run = ?, last_result = ?, next_run = ? WHERE id = ?')
        .run(failedAt, `ERROR: ${err.message}`, nextRun, jobId);

      db.prepare('UPDATE instances SET status = ?, ended_at = ? WHERE id = ?')
        .run('error', failedAt, instanceId);
      
      db.prepare('INSERT INTO instance_logs (id, instance_id, level, message, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), instanceId, 'error', `Cron job "${job.name}" failed: ${err.message}`, failedAt);

      if (this.io) {
        this.io.to('instances').emit('instance:log', { 
          instanceId, 
          level: 'error', 
          message: `Job ${job.name} failed: ${err.message}`, 
          timestamp: failedAt 
        });
      }

      throw err;
    }
  }

  private scheduleHeartbeats(): void {
    // Every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      console.log('[Cron] Running proactive heartbeats...');
      const db = getDb();
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'proactive_checks_enabled'").get() as { value: string } | undefined;
      if (setting?.value !== 'true') {
        return;
      }

      const agents = db.prepare("SELECT id, status FROM agents WHERE status != 'offline'").all() as { id: string; status: string }[];

      for (const { id } of agents) {
        try {
          const engine = new AgentEngine(id);
          const proactiveResult = await engine.proactiveCheck();
          
          if (proactiveResult && proactiveResult.message) {
            console.log(`[Cron] Proactive message from agent ${id}: ${proactiveResult.message.substring(0, 50)}...`);
            if (this.io) {
              this.io.emit('agent:proactive', { agentId: id, message: proactiveResult.message });
            }
          }
        } catch (err) {
          console.error(`[Cron] Proactive check failed for agent ${id}:`, err);
        }
      }
    });
  }

  private calculateNextRun(schedule: string, timezone: string): string | null {
    try {
      const fields = schedule.trim().split(/\s+/);
      const hasSeconds = fields.length === 6;
      const secondsField = hasSeconds ? fields[0] : '0';
      const stepMs = hasSeconds && secondsField !== '0' ? 1000 : 60000;
      const matcher = new (TimeMatcher as any)(schedule, timezone);
      let cursor = new Date();

      if (stepMs === 60000) {
        cursor.setSeconds(0, 0);
        cursor = new Date(cursor.getTime() + 60000);
      } else {
        cursor = new Date(cursor.getTime() + 1000);
      }

      const maxIterations = stepMs === 1000 ? 60 * 60 * 24 * 366 : 60 * 24 * 366;
      for (let i = 0; i < maxIterations; i++) {
        if (matcher.match(cursor)) {
          return matcher.apply(cursor).toISOString();
        }
        cursor = new Date(cursor.getTime() + stepMs);
      }
    } catch (err) {
      console.error('[Cron] Failed to calculate next run:', err);
    }
    return null;
  }
}
