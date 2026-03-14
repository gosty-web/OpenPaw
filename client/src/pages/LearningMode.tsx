import { useEffect, useRef, useState } from 'react'
import { Monitor, Mic, MicOff, Play, Sparkles, Square, Wand2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, type Agent, type Skill } from '../lib/api'
import { toast } from '../lib/toast'

type CaptureStatus = 'idle' | 'running'

export function LearningMode() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle')
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [generatedSkill, setGeneratedSkill] = useState<Skill | null>(null)
  const [generating, setGenerating] = useState(false)
  const [savingToAgent, setSavingToAgent] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureTimerRef = useRef<number | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const sessionRef = useRef<string | null>(null)
  const transcriptRef = useRef<string>('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioRafRef = useRef<number | null>(null)

  useEffect(() => {
    api.agents
      .list()
      .then((list) => {
        setAgents(list)
        if (!selectedAgent && list.length > 0) {
          setSelectedAgent(list[0].id)
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load agents'))
  }, [])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => () => stopAll(), [])

  const startSession = async () => {
    if (!selectedAgent) {
      toast.warning('Select an agent to teach')
      return
    }
    try {
      const response = await api.learning.start(selectedAgent)
      setSessionId(response.sessionId)
      sessionRef.current = response.sessionId
      setGeneratedSkill(null)
      setTranscript('')
      setPreviewUrl(null)
      toast.success('Learning session started')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start learning session')
    }
  }

  const startScreenShare = async () => {
    if (!sessionRef.current) {
      toast.warning('Start a learning session first')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      const [track] = stream.getVideoTracks()
      if (track) {
        track.onended = () => stopScreenShare()
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startCaptureLoop()
      setCaptureStatus('running')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Screen share cancelled')
    }
  }

  const startCaptureLoop = () => {
    if (captureTimerRef.current) window.clearInterval(captureTimerRef.current)
    captureTimerRef.current = window.setInterval(async () => {
      const session = sessionRef.current
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!session || !video || !canvas) return
      if (!video.videoWidth || !video.videoHeight) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65)
      setPreviewUrl(dataUrl)

      try {
        await api.learning.frame({
          sessionId: session,
          image: dataUrl,
          transcript: transcriptRef.current.trim() ? transcriptRef.current : undefined,
        })
      } catch (error) {
        console.error(error)
      }
    }, 2000)
  }

  const stopScreenShare = () => {
    if (captureTimerRef.current) {
      window.clearInterval(captureTimerRef.current)
      captureTimerRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
    setCaptureStatus('idle')
  }

  const startAudioMeter = () => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const buffer = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(buffer)
      let sum = 0
      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128
        sum += value * value
      }
      const rms = Math.sqrt(sum / buffer.length)
      setAudioLevel(Math.min(100, Math.round(rms * 140)))
      audioRafRef.current = requestAnimationFrame(tick)
    }

    if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current)
    audioRafRef.current = requestAnimationFrame(tick)
  }

  const startRecording = async () => {
    if (!sessionRef.current) {
      toast.warning('Start a learning session first')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      startAudioMeter()
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return
        try {
          const audioBase64 = await blobToBase64(event.data)
          const result = await api.learning.transcribe({
            audioBase64,
            mimeType: event.data.type,
          })
          if (result.text?.trim()) {
            setTranscript((current) => {
              const next = current ? `${current} ${result.text}` : result.text
              transcriptRef.current = next
              return next
            })
          }
        } catch (error) {
          console.error(error)
        }
      }
      recorder.start(2000)
      setRecording(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Microphone permission denied')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (audioRafRef.current) {
      cancelAnimationFrame(audioRafRef.current)
      audioRafRef.current = null
    }
    analyserRef.current = null
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    setAudioLevel(0)
    setRecording(false)
  }

  const stopAll = () => {
    stopScreenShare()
    stopRecording()
  }

  const endSession = async () => {
    if (!sessionRef.current) return
    setGenerating(true)
    stopAll()
    try {
      const skill = await api.learning.end({ sessionId: sessionRef.current })
      setGeneratedSkill(skill)
      setSessionId(null)
      sessionRef.current = null
      toast.success('Skill generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate skill')
    } finally {
      setGenerating(false)
    }
  }

  const saveToAgent = async () => {
    if (!generatedSkill || !selectedAgent) return
    setSavingToAgent(true)
    try {
      await api.skills.attachToAgent(selectedAgent, generatedSkill.id)
      toast.success('Skill attached to agent')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to attach skill')
    } finally {
      setSavingToAgent(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-paw-border bg-paw-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paw-accent-bg text-paw-accent">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-paw-text">Live Learning Mode</h1>
                  <p className="text-sm text-paw-muted">Show the agent a task live and turn it into a reusable skill.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={startSession} disabled={!selectedAgent || !!sessionId}>
                <Play size={16} />
                {sessionId ? 'Session Active' : 'Start Learning Session'}
              </button>
              <button type="button" className="btn-primary" onClick={endSession} disabled={!sessionId || generating}>
                <Wand2 size={16} />
                {generating ? 'Generating...' : 'Stop & Generate Skill'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-paw-text">Capture</h2>
                <p className="text-sm text-paw-muted">Share your screen and narrate the steps.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-paw-muted">
                Agent
                <select
                  className="input"
                  value={selectedAgent}
                  onChange={(event) => setSelectedAgent(event.target.value)}
                  disabled={Boolean(sessionId)}
                >
                  {agents.length === 0 && <option value="">No agents available</option>}
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn-secondary" onClick={startScreenShare} disabled={!sessionId || captureStatus === 'running'}>
                <Monitor size={16} />
                Share Screen
              </button>
              <button type="button" className="btn-ghost" onClick={stopScreenShare} disabled={captureStatus === 'idle'}>
                <Square size={16} />
                Stop Share
              </button>
              <button type="button" className="btn-secondary" onClick={startRecording} disabled={!sessionId || recording}>
                <Mic size={16} />
                Start Voice
              </button>
              <button type="button" className="btn-ghost" onClick={stopRecording} disabled={!recording}>
                <MicOff size={16} />
                Stop Voice
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-paw-border bg-paw-bg p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-paw-faint">
                <span>Live Preview</span>
                <span>{captureStatus === 'running' ? 'Capturing every 2s' : 'Idle'}</span>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-paw-border bg-paw-raised">
                {previewUrl ? (
                  <img src={previewUrl} alt="Screen preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-paw-faint">No preview yet</div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-paw-border bg-paw-bg p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-paw-faint">Transcript</div>
              <div className="min-h-[120px] whitespace-pre-wrap text-sm leading-7 text-paw-muted">
                {transcript || 'Voice transcript will appear here.'}
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs text-paw-faint">Voice level</div>
                <div className="h-2 rounded-full bg-paw-overlay">
                  <div
                    className="h-2 rounded-full bg-paw-accent transition-[width] duration-150"
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-paw-text">Generated Skill</h2>
                <p className="text-sm text-paw-muted">Review and save the skill to your agent.</p>
              </div>
              <button type="button" className="btn-primary" onClick={saveToAgent} disabled={!generatedSkill || savingToAgent}>
                <Sparkles size={16} />
                {savingToAgent ? 'Saving...' : 'Save to Agent'}
              </button>
            </div>

            <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
              {generatedSkill ? (
                <div className="prose prose-invert max-w-none prose-p:text-paw-muted prose-headings:text-paw-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedSkill.content ?? ''}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm text-paw-faint">Generate a skill to preview it here.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read audio data'))
    reader.readAsDataURL(blob)
  })
}
