import type { Server as SocketServer } from 'socket.io';
import type { AgentStatus } from './types/agent.js';

let io: SocketServer | null = null;

export function setSocketServer(server: SocketServer) {
  io = server;
}

export function getSocketServer(): SocketServer | null {
  return io;
}

export function emitAgentStatus(agentId: string, status: AgentStatus) {
  if (!io) return;
  io.emit('agent:status', { agentId, status });
}
