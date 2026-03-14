export const TABLE_COUNT = 20

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  personality TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle',
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  vitality_json TEXT NOT NULL DEFAULT '{}',
  soul_md TEXT NOT NULL DEFAULT '',
  user_md TEXT NOT NULL DEFAULT '',
  agents_md TEXT NOT NULL DEFAULT '',
  identity_md TEXT NOT NULL DEFAULT '',
  memory_md TEXT NOT NULL DEFAULT '',
  heartbeat_md TEXT NOT NULL DEFAULT '',
  growth_md TEXT NOT NULL DEFAULT '',
  bonds_md TEXT NOT NULL DEFAULT '',
  hot_memory TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('hot', 'episodic', 'semantic')),
  content TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  tags_json TEXT NOT NULL DEFAULT '[]',
  session_id TEXT,
  created_at TEXT NOT NULL,
  accessed_at TEXT,
  access_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  session_id TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('org', 'division', 'team', 'project')),
  description TEXT DEFAULT '',
  context_md TEXT NOT NULL DEFAULT '',
  parent_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES workspaces(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workspace_agents (
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, agent_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('open', 'bidding', 'assigned', 'in_progress', 'completed', 'failed')),
  publisher_id TEXT NOT NULL,
  assignee_id TEXT,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'medium',
  result TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (publisher_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_bids (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  bidder_id TEXT NOT NULL,
  capability_score REAL NOT NULL DEFAULT 0,
  estimated_minutes INTEGER,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (bidder_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mcps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stdio', 'sse', 'http')),
  command TEXT,
  args_json TEXT NOT NULL DEFAULT '[]',
  url TEXT,
  auth_token TEXT,
  headers_json TEXT NOT NULL DEFAULT '{}',
  env_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  global INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_mcps (
  agent_id TEXT NOT NULL,
  mcp_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (agent_id, mcp_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (mcp_id) REFERENCES mcps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Custom',
  tags_json TEXT NOT NULL DEFAULT '[]',
  content_md TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (agent_id, skill_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  agent_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule TEXT NOT NULL,
  timezone TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  max_retries INTEGER NOT NULL DEFAULT 0,
  timeout_minutes INTEGER NOT NULL DEFAULT 10,
  last_run TEXT,
  last_result TEXT,
  next_run TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('telegram', 'discord', 'slack', 'whatsapp', 'web')),
  config_json TEXT NOT NULL DEFAULT '{}',
  agent_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('chat-session', 'telegram-bot', 'discord-bot', 'cron-job', 'webhook')),
  agent_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'idle', 'error', 'stopped')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instance_logs (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used TEXT
);

CREATE TABLE IF NOT EXISTS agent_model_overrides (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('openclaw', 'file', 'manual')),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memories_agent_tier ON memories(agent_id, tier);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(agent_id, session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_instance_logs_instance ON instance_logs(instance_id, created_at);

CREATE TABLE IF NOT EXISTS slash_commands (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  is_builtin INTEGER DEFAULT 0,
  agent_id TEXT,
  created_at TEXT
);
`
