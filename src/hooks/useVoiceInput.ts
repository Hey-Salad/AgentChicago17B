import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'recording' | 'transcribing' | 'error'

/** How often to ship audio to Whisper while the mic is open. */
const LIVE_SLICE_MS = 1600
const MIN_BLOB_BYTES = 1200

type VoiceInputOptions = {
  /** Snapshot of the composer when recording starts (typed text kept as prefix). */
  getBaseText: () => string
  /** Full composer value = prefix + live transcript. */
  onChange: (text: string) => void
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

function joinText(base: string, session: string): string {
  const b = base.trim()
  const s = session.trim()
  if (!b) return s
  if (!s) return b
  return `${b} ${s}`
}

async function requestTranscript(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const audioBase64 = arrayBufferToBase64(buffer)
  const response = await fetch('/api/stt/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
    }),
  })
  const data = (await response.json()) as {
    text?: string
    error?: string
  }
  if (!response.ok || data.error) {
    throw new Error(data.error || `Speech failed (${response.status})`)
  }
  return (data.text || '').trim()
}

export function useVoiceInput({ getBaseText, onChange }: VoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const baseRef = useRef('')
  const sessionRef = useRef('')
  const mimeRef = useRef('audio/webm')
  const recordingRef = useRef(false)
  const inFlightRef = useRef(false)
  const pendingLiveRef = useRef(false)
  const generationRef = useRef(0)

  const publish = useCallback(
    (sessionText: string) => {
      sessionRef.current = sessionText
      onChange(joinText(baseRef.current, sessionText))
    },
    [onChange],
  )

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    mediaRef.current = null
  }, [])

  useEffect(() => () => cleanupStream(), [cleanupStream])

  const runLivePass = useCallback(async () => {
    if (!recordingRef.current || inFlightRef.current) {
      if (recordingRef.current) pendingLiveRef.current = true
      return
    }

    const type = mimeRef.current
    const blob = new Blob(chunksRef.current, { type })
    if (blob.size < MIN_BLOB_BYTES) return

    inFlightRef.current = true
    pendingLiveRef.current = false
    const gen = generationRef.current

    try {
      const text = await requestTranscript(blob)
      if (gen !== generationRef.current) return
      if (text) publish(text)
    } catch {
      // Live passes are best-effort; final stop still reports errors.
    } finally {
      inFlightRef.current = false
      if (
        recordingRef.current &&
        pendingLiveRef.current &&
        gen === generationRef.current
      ) {
        void runLivePass()
      }
    }
  }, [publish])

  const finish = useCallback(async () => {
    recordingRef.current = false
    setStatus('transcribing')
    setError(null)

    const type = mimeRef.current
    const blob = new Blob(chunksRef.current, { type })
    chunksRef.current = []
    cleanupStream()

    const gen = generationRef.current

    if (blob.size < 256) {
      if (!sessionRef.current.trim()) {
        setError('Recording was too short — hold the mic a moment longer.')
        setStatus('error')
      } else {
        setStatus('idle')
      }
      return
    }

    // Wait briefly if a live pass is still in flight.
    for (let i = 0; i < 40 && inFlightRef.current; i += 1) {
      await new Promise((r) => setTimeout(r, 50))
    }

    try {
      const text = await requestTranscript(blob)
      if (gen !== generationRef.current) return
      if (text) {
        publish(text)
        setStatus('idle')
        return
      }
      if (sessionRef.current.trim()) {
        setStatus('idle')
        return
      }
      setError('Couldn’t hear that — try again a bit louder.')
      setStatus('error')
    } catch (err) {
      if (gen !== generationRef.current) return
      if (sessionRef.current.trim()) {
        setStatus('idle')
        return
      }
      const message =
        err instanceof Error ? err.message : 'Speech recognition failed'
      setError(message)
      setStatus('error')
    }
  }, [cleanupStream, publish])

  const stop = useCallback(() => {
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, [])

  const start = useCallback(async () => {
    if (status === 'recording' || status === 'transcribing') return
    setError(null)

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError('Microphone isn’t available in this browser.')
      setStatus('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      generationRef.current += 1
      mediaRef.current = recorder
      chunksRef.current = []
      baseRef.current = getBaseText().trim()
      sessionRef.current = ''
      mimeRef.current = recorder.mimeType || mimeType || 'audio/webm'
      recordingRef.current = true
      inFlightRef.current = false
      pendingLiveRef.current = false

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          if (recordingRef.current) void runLivePass()
        }
      }
      recorder.onstop = () => {
        void finish()
      }

      recorder.start(LIVE_SLICE_MS)
      setStatus('recording')
    } catch {
      recordingRef.current = false
      cleanupStream()
      setError('Microphone permission is needed to talk to AgentChicago17B.')
      setStatus('error')
    }
  }, [cleanupStream, finish, getBaseText, runLivePass, status])

  const toggle = useCallback(async () => {
    if (status === 'recording') {
      stop()
      return
    }
    if (status === 'transcribing') return
    await start()
  }, [start, status, stop])

  return {
    status,
    error,
    isRecording: status === 'recording',
    isBusy: status === 'recording' || status === 'transcribing',
    toggle,
    clearError: () => {
      setError(null)
      if (status === 'error') setStatus('idle')
    },
  }
}
