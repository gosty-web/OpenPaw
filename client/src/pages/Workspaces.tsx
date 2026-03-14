import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Building2, CheckCircle2, FolderOpen, Layers, PenSquare, Plus, Search, Sparkles, Users, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'
import { api, type Agent, type Workspace, type WorkspaceTask } from '../lib/api'
import { toast } from '../lib/toast'

type WorkspaceType = NonNullable<Workspace['type']>
type TaskFilter = 'all' | NonNullable<WorkspaceTask['status']>

const workspaceTypes: Array<{ id: WorkspaceType; label: string; icon: typeof Building2; description: string }> = [
  { id: 'org', label: 'Organization', icon: Building2, description: 'High-level coordination across multiple functions.' },
  { id: 'division', label: 'Division', icon: Briefcase, description: 'A discipline or business area with shared goals.' },
  { id: 'team', label: 'Team', icon: Layers, description: 'A delivery team with tightly shared execution context.' },
  { id: 'project', label: 'Project', icon: FolderOpen, description: 'A temporary strike team for a focused mission.' },
]

const priorityTone: Record<NonNullable<WorkspaceTask['priority']>, string> = {
  low: 'bg-paw-muted',
  medium: 'bg-paw-warning',
  high: 'bg-paw-danger',
}

function workspaceTypeMeta(type?: WorkspaceType) {
  return workspaceTypes.find((entry) => entry.id === type) ?? workspaceTypes[2]
}

function statusTone(status?: WorkspaceTask['status']) {
  if (status === 'completed') return 'bg-paw-success-bg text-paw-success'
  if (status === 'in_progress') return 'bg-paw-info-bg text-paw-info'
  return 'bg-paw-warning-bg text-paw-warning'
}

function statusLabel(status?: WorkspaceTask['status']) {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In Progress'
  return 'Open'
}

export function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [taskLoading, setTaskLoading] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [contextDraft, setContextDraft] = useState('')
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskSkills, setTaskSkills] = useState('')
  const [taskPriority, setTaskPriority] = useState<NonNullable<WorkspaceTask['priority']>>('medium')
  const [publishingTask, setPublishingTask] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [addAgentOpen, setAddAgentOpen] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const [memberRoleDraft, setMemberRoleDraft] = useState('Contributor')
  const [addingAgentId, setAddingAgentId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceType, setNewWorkspaceType] = useState<WorkspaceType>('team')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [newWorkspaceAgents, setNewWorkspaceAgents] = useState<string[]>([])
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)

  useEffect(() => {
    Promise.all([api.workspaces.list(), api.agents.list()])
      .then(([workspaceData, agentData]) => {
        setWorkspaces(workspaceData)
        setAgents(agentData)
        setSelectedWorkspaceId((current) => current ?? workspaceData[0]?.id ?? null)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load workspaces'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setTasks([])
      return
    }

    setTaskLoading(true)
    Promise.all([api.workspaces.get(selectedWorkspaceId), api.workspaces.tasks(selectedWorkspaceId)])
      .then(([workspace, taskData]) => {
        setWorkspaces((current) => current.map((entry) => (entry.id === workspace.id ? workspace : entry)))
        setDescriptionDraft(workspace.description ?? '')
        setContextDraft(workspace.context ?? '')
        setTasks(taskData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load workspace detail'))
      .finally(() => setTaskLoading(false))
  }, [selectedWorkspaceId])

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces],
  )

  const memberAgents = useMemo(() => {
    if (!selectedWorkspace?.members) return []
    return selectedWorkspace.members
      .map((member) => ({ member, agent: agents.find((agent) => agent.id === member.agentId) }))
      .filter((entry): entry is { member: NonNullable<Workspace['members']>[number]; agent: Agent } => Boolean(entry.agent))
  }, [agents, selectedWorkspace])

  const availableAgents = useMemo(() => {
    const assigned = new Set(selectedWorkspace?.members?.map((member) => member.agentId) ?? [])
    const query = agentSearch.trim().toLowerCase()
    return agents.filter((agent) => !assigned.has(agent.id) && (!query || `${agent.name} ${agent.role ?? ''}`.toLowerCase().includes(query)))
  }, [agentSearch, agents, selectedWorkspace])

  const filteredTasks = useMemo(() => (taskFilter === 'all' ? tasks : tasks.filter((task) => task.status === taskFilter)), [taskFilter, tasks])

  const taskColumns = useMemo(
    () => ({
      open: tasks.filter((task) => task.status === 'open'),
      in_progress: tasks.filter((task) => task.status === 'in_progress'),
      completed: tasks.filter((task) => task.status === 'completed'),
    }),
    [tasks],
  )

  const updateWorkspaceList = (updated: Workspace) => {
    setWorkspaces((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
  }

  const saveWorkspaceField = async (payload: Partial<Workspace>) => {
    if (!selectedWorkspace) return
    setSavingWorkspace(true)
    try {
      const updated = await api.workspaces.update(selectedWorkspace.id, payload)
      updateWorkspaceList(updated)
      if (payload.description !== undefined) setDescriptionDraft(updated.description ?? '')
      if (payload.context !== undefined) setContextDraft(updated.context ?? '')
      toast.success(`${updated.name} updated`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update workspace')
    } finally {
      setSavingWorkspace(false)
    }
  }

  const addAgentToWorkspace = async (agentId: string) => {
    if (!selectedWorkspace) return
    setAddingAgentId(agentId)
    try {
      const updated = await api.workspaces.addAgent(selectedWorkspace.id, agentId, memberRoleDraft)
      updateWorkspaceList(updated)
      setAddAgentOpen(false)
      setAgentSearch('')
      setMemberRoleDraft('Contributor')
      toast.success('Agent added to workspace')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add agent')
    } finally {
      setAddingAgentId(null)
    }
  }

  const removeAgentFromWorkspace = async (agentId: string) => {
    if (!selectedWorkspace) return
    try {
      await api.workspaces.removeAgent(selectedWorkspace.id, agentId)
      const refreshed = await api.workspaces.get(selectedWorkspace.id)
      updateWorkspaceList(refreshed)
      toast.success('Agent removed from workspace')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove agent')
    }
  }

  const publishTask = async () => {
    if (!selectedWorkspace || !taskTitle.trim()) {
      toast.warning('Task title is required')
      return
    }
    setPublishingTask(true)
    try {
      const created = await api.workspaces.createTask(selectedWorkspace.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        requiredSkills: taskSkills.split(',').map((entry) => entry.trim()).filter(Boolean),
      })
      setTasks((current) => [created, ...current])
      setTaskTitle('')
      setTaskDescription('')
      setTaskSkills('')
      setTaskPriority('medium')
      setExpandedTaskId(created.id)
      toast.success('Task published to the workspace')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to publish task')
    } finally {
      setPublishingTask(false)
    }
  }

  const assignBidWinner = async (task: WorkspaceTask, agentId: string) => {
    if (!selectedWorkspace) return
    try {
      const updated = await api.workspaces.updateTask(selectedWorkspace.id, task.id, { assigneeId: agentId, status: 'in_progress' })
      setTasks((current) => current.map((entry) => (entry.id === task.id ? updated : entry)))
      toast.success('Task assigned through A2A bidding')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to assign task')
    }
  }

  const completeTask = async (task: WorkspaceTask) => {
    if (!selectedWorkspace) return
    try {
      const updated = await api.workspaces.updateTask(selectedWorkspace.id, task.id, { status: 'completed' })
      setTasks((current) => current.map((entry) => (entry.id === task.id ? updated : entry)))
      toast.success('Task marked as completed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete task')
    }
  }

  const toggleInitialAgent = (agentId: string) => {
    setNewWorkspaceAgents((current) => (current.includes(agentId) ? current.filter((entry) => entry !== agentId) : [...current, agentId]))
  }

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.warning('Workspace name is required')
      return
    }
    setCreatingWorkspace(true)
    try {
      const created = await api.workspaces.create({
        name: newWorkspaceName.trim(),
        type: newWorkspaceType,
        description: newWorkspaceDescription.trim(),
        members: newWorkspaceAgents.map((agentId) => ({ agentId, role: 'Member' })),
      })
      setWorkspaces((current) => [created, ...current])
      setSelectedWorkspaceId(created.id)
      setCreateOpen(false)
      setNewWorkspaceName('')
      setNewWorkspaceDescription('')
      setNewWorkspaceType('team')
      setNewWorkspaceAgents([])
      toast.success('Workspace created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create workspace')
    } finally {
      setCreatingWorkspace(false)
    }
  }

  return (
    <div className="min-h-0 flex h-full flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-paw-border bg-paw-surface p-6 shadow-sm shadow-black/5">
        <div className="relative z-10 flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paw-accent/10 text-paw-accent">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-paw-text">Workspaces</h1>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-paw-muted">Orchestrate multi-agent collaborations. Workspaces provide shared context and A2A coordination protocols for complex, cross-functional missions.</p>
          </div>
        </div>
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-paw-accent/5 blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 xl:flex-row">
        <aside className="no-scrollbar flex shrink-0 flex-col overflow-hidden rounded-2xl border border-paw-border bg-paw-surface/50 xl:w-[260px]">
          <div className="p-4">
            <button type="button" className="btn-primary w-full justify-center shadow-lg shadow-paw-accent/20" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New Workspace
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {loading ? (
              <div className="space-y-2 px-2">
                {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-paw-raised/50" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {workspaces.map((workspace) => {
                  const meta = workspaceTypeMeta(workspace.type)
                  const Icon = meta.icon
                  const selected = workspace.id === selectedWorkspaceId
                  return (
                    <button 
                      key={workspace.id} 
                      type="button" 
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        selected 
                          ? 'bg-paw-accent text-white shadow-md shadow-paw-accent/20' 
                          : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'
                      }`} 
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected ? 'bg-white/20' : 'bg-paw-raised group-hover:bg-paw-border'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{workspace.name}</div>
                        <div className={`text-[10px] opacity-70 ${selected ? 'text-white' : 'text-paw-faint'}`}>
                          {workspace.agentCount ?? workspace.members?.length ?? 0} agents
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-paw-border bg-paw-surface">
          {!selectedWorkspace ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <Sparkles size={44} className="mb-4 text-paw-faint opacity-20" />
              <h2 className="mb-2 text-xl font-semibold text-paw-text">Select a workspace</h2>
              <p className="max-w-md text-sm leading-7 text-paw-muted">Choose a workspace from the left to manage members, shared context, and A2A task coordination.</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-paw-border px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-paw-text">{selectedWorkspace.name}</h2>
                  <span className="badge bg-paw-raised text-paw-muted">{workspaceTypeMeta(selectedWorkspace.type).label}</span>
                </div>
                <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-paw-faint">
                    <PenSquare size={14} />
                    Description
                  </div>
                  <textarea className="input min-h-[92px] resize-none" value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} onBlur={() => { if (descriptionDraft !== (selectedWorkspace.description ?? '')) void saveWorkspaceField({ description: descriptionDraft }) }} />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Team Members</h3>
                        <p className="mt-1 text-sm text-paw-muted">Assign specialists to this workspace and define how they participate.</p>
                      </div>
                      <button type="button" className="btn-secondary" onClick={() => setAddAgentOpen((current) => !current)}>
                        <Plus size={16} />
                        Add Agent
                      </button>
                    </div>

                    {addAgentOpen ? (
                      <div className="mb-4 rounded-2xl border border-paw-border bg-paw-surface p-4">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                          <label className="block">
                            <span className="label">Search Agents</span>
                            <div className="relative">
                              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paw-faint" />
                              <input className="input pl-9" value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Search by name or role" />
                            </div>
                          </label>
                          <label className="block">
                            <span className="label">Workspace Role</span>
                            <input className="input" value={memberRoleDraft} onChange={(event) => setMemberRoleDraft(event.target.value)} />
                          </label>
                        </div>
                        <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                          {availableAgents.map((agent) => (
                            <button key={agent.id} type="button" className="flex w-full items-center gap-3 rounded-xl border border-paw-border bg-paw-bg px-3 py-3 text-left hover:border-paw-border-strong hover:bg-paw-raised" onClick={() => void addAgentToWorkspace(agent.id)} disabled={addingAgentId === agent.id}>
                              <AgentAvatar name={agent.name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-paw-text">{agent.name}</div>
                                <div className="truncate text-xs text-paw-faint">{agent.role}</div>
                              </div>
                              <div className="text-xs text-paw-muted">{addingAgentId === agent.id ? 'Adding...' : memberRoleDraft}</div>
                            </button>
                          ))}
                          {availableAgents.length === 0 ? <div className="text-sm text-paw-faint">No matching agents available.</div> : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      {memberAgents.map(({ member, agent }) => (
                        <div key={agent.id} className="group relative min-w-[200px] rounded-2xl border border-paw-border bg-paw-surface p-4">
                          <button type="button" className="absolute right-3 top-3 text-paw-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-paw-danger" onClick={() => void removeAgentFromWorkspace(agent.id)} aria-label={`Remove ${agent.name}`}>
                            <X size={14} />
                          </button>
                          <div className="mb-3 flex items-center gap-3">
                            <AgentAvatar name={agent.name} size="sm" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-paw-text">{agent.name}</div>
                              <div className="truncate text-xs text-paw-muted">{agent.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-paw-faint">{member.role}</span>
                            <StatusBadge status={agent.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Context</h3>
                      <p className="mt-1 text-sm text-paw-muted">This is what all agents in this workspace know about the team's goals and rules.</p>
                    </div>
                    <textarea className="input min-h-[220px] resize-y font-mono text-xs leading-6" value={contextDraft} onChange={(event) => setContextDraft(event.target.value)} />
                    <div className="mt-3 flex justify-end">
                      <button type="button" className="btn-secondary" onClick={() => void saveWorkspaceField({ context: contextDraft })} disabled={savingWorkspace}>
                        {savingWorkspace ? 'Saving...' : 'Save Context'}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-paw-border bg-paw-bg/30 p-4">
                    <div className="mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-paw-faint">Sprint Status</h3>
                      <p className="mt-1 text-sm text-paw-muted">Continuous A2A task flow monitoring.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {([['open', 'Pending'], ['in_progress', 'Active'], ['completed', 'Resolved']] as const).map(([key, label]) => (
                        <div key={key} className="flex flex-col gap-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-paw-muted">{label}</span>
                            <span className="text-[10px] font-mono text-paw-faint">{taskColumns[key].length}</span>
                          </div>
                          <div className="min-h-[100px] space-y-2 rounded-xl border border-paw-border/50 bg-paw-surface/30 p-2">
                            {taskColumns[key].slice(0, 4).map((task) => (
                              <div key={task.id} className="rounded-lg border border-paw-border bg-paw-surface p-2.5 shadow-sm transition-all hover:border-paw-accent/20">
                                <div className="line-clamp-2 text-xs font-medium text-paw-text">{task.title}</div>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    {task.assigneeName && <AgentAvatar name={task.assigneeName} size="sm" />}
                                    <span className="truncate text-[10px] text-paw-faint">{task.assigneeName ?? 'Unassigned'}</span>
                                  </div>
                                  <div className={`h-1.5 w-1.5 rounded-full ${priorityTone[task.priority ?? 'medium']}`} />
                                </div>
                              </div>
                            ))}
                            {taskColumns[key].length === 0 && (
                              <div className="flex h-16 items-center justify-center text-[10px] text-paw-faint italic">Empty</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-paw-border bg-paw-surface xl:w-[300px]">
          <div className="border-b border-paw-border px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Tasks</h3>
              <button type="button" className="btn-primary px-3" onClick={() => setExpandedTaskId('new')} disabled={!selectedWorkspace}>
                <Plus size={16} />
                New Task
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {([['all', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['completed', 'Completed']] as const).map(([value, label]) => (
                <button key={value} type="button" className={`rounded-full px-3 py-1.5 text-xs transition ${taskFilter === value ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`} onClick={() => setTaskFilter(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selectedWorkspace ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                  <div className="mb-3 text-sm font-semibold text-paw-text">Publish a task</div>
                  <div className="space-y-3">
                    <input className="input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" />
                    <textarea className="input min-h-[92px] resize-y" value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Describe the outcome and constraints" />
                    <input className="input" value={taskSkills} onChange={(event) => setTaskSkills(event.target.value)} placeholder="Required skills, comma separated" />
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((priority) => (
                        <button key={priority} type="button" className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${taskPriority === priority ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`} onClick={() => setTaskPriority(priority)}>
                          {priority}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn-primary w-full justify-center" onClick={() => void publishTask()} disabled={publishingTask}>
                      {publishingTask ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>

                {taskLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-paw-raised" />)}
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                      <button type="button" className="w-full text-left" onClick={() => setExpandedTaskId((current) => (current === task.id ? null : task.id))}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-paw-text">{task.title}</div>
                            <div className="mt-1 text-xs leading-6 text-paw-muted">{task.description || 'No description yet.'}</div>
                          </div>
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityTone[task.priority ?? 'medium']}`} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${statusTone(task.status)}`}>{statusLabel(task.status)}</span>
                          <div className="flex items-center gap-2 text-xs text-paw-faint">
                            {task.assigneeName ? <AgentAvatar name={task.assigneeName} size="sm" /> : null}
                            <span>{task.assigneeName ?? 'No winner yet'}</span>
                          </div>
                        </div>
                      </button>

                      {expandedTaskId === task.id ? (
                        <div className="mt-4 space-y-3 border-t border-paw-border pt-4">
                          <div className="flex flex-wrap gap-2">
                            {(task.requiredSkills ?? []).map((skill) => <span key={skill} className="rounded-full bg-paw-raised px-2.5 py-1 text-xs text-paw-muted">{skill}</span>)}
                          </div>
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-paw-faint">A2A bids</div>
                            <div className="space-y-2">
                              {(task.bids ?? []).map((bid) => (
                                <div key={bid.agentId} className="rounded-xl border border-paw-border bg-paw-surface p-3">
                                  <div className="mb-1 text-sm font-medium text-paw-text">{bid.agentName}</div>
                                  <div className="text-xs leading-6 text-paw-muted">{bid.summary}</div>
                                  <button type="button" className="btn-secondary mt-3 text-xs" onClick={() => void assignBidWinner(task, bid.agentId)}>
                                    Select Winner
                                  </button>
                                </div>
                              ))}
                              {(task.bids ?? []).length === 0 ? <div className="text-sm text-paw-faint">No bids yet.</div> : null}
                            </div>
                          </div>
                          {task.status !== 'completed' && task.assigneeId ? (
                            <button type="button" className="btn-primary w-full justify-center" onClick={() => void completeTask(task)}>
                              <CheckCircle2 size={16} />
                              Mark Complete
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-paw-faint">Select a workspace to manage tasks.</div>
            )}
          </div>
        </aside>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Workspace">
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="label">Name</span>
              <input className="input" value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder="Engineering, Marketing, Launch Lab" />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea className="input min-h-[92px] resize-y" value={newWorkspaceDescription} onChange={(event) => setNewWorkspaceDescription(event.target.value)} placeholder="Describe what this workspace is responsible for." />
            </label>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Type</div>
            <div className="grid gap-3 md:grid-cols-2">
              {workspaceTypes.map((type) => {
                const Icon = type.icon
                const active = newWorkspaceType === type.id
                return (
                  <button key={type.id} type="button" className={`rounded-2xl border p-4 text-left transition ${active ? 'border-paw-accent bg-paw-accent-bg/60' : 'border-paw-border bg-paw-bg hover:border-paw-border-strong hover:bg-paw-raised'}`} onClick={() => setNewWorkspaceType(type.id)}>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-paw-raised text-paw-accent">
                      <Icon size={18} />
                    </div>
                    <div className="text-sm font-semibold text-paw-text">{type.label}</div>
                    <div className="mt-2 text-xs leading-6 text-paw-muted">{type.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Initial Agents</div>
            <div className="grid gap-2 md:grid-cols-2">
              {agents.map((agent) => {
                const active = newWorkspaceAgents.includes(agent.id)
                return (
                  <button key={agent.id} type="button" className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${active ? 'border-paw-accent bg-paw-accent-bg/60' : 'border-paw-border bg-paw-bg hover:border-paw-border-strong hover:bg-paw-raised'}`} onClick={() => toggleInitialAgent(agent.id)}>
                    <AgentAvatar name={agent.name} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-paw-text">{agent.name}</div>
                      <div className="truncate text-xs text-paw-faint">{agent.role}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void createWorkspace()} disabled={creatingWorkspace}>
              {creatingWorkspace ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
