import { io } from 'socket.io-client'

export const socket = io({ path: '/socket.io', autoConnect: true })

export type SocketEvent =
  | 'agent:status'
  | 'agent:thinking'
  | 'chat:chunk'
  | 'server:ready'
  | 'instance:update'
  | 'instance:log'
