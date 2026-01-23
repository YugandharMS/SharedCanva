'use client'
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import MemberList from './MemberList'
import type { Member } from '@/types'

// Type definitions duplicated from canvas.tsx to avoid circular dependency
type Point = { x: number; y: number; pressure: number }
export type Stroke = {
  id: string
  tool: 'pen' | 'eraser'
  color: string
  width: number
  points: Point[]
  createdAt: number
}

export type MobileCanvasHandle = {
  addRemoteStroke: (stroke: Stroke) => void
  loadSnapshot: (serialized: string) => void
  removeStroke: (strokeId: string) => void
  getSerialized: () => string
}

type MobileCanvasViewProps = {
  members: Member[]
  selfMemberId: string | null
  onStrokeComplete: (stroke: Stroke) => void
  onUndo: (stroke: Stroke) => void
  onExitLandscape: () => void
}

// Utility: generate short unique id
const uid = () => Math.random().toString(36).slice(2, 10)

// Line drawing helper
function drawStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  devicePixelRatio: number
) {
  if (!stroke.points || stroke.points.length === 0) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  const first = stroke.points[0]
  const w = stroke.width || 1
  ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.moveTo(first.x * devicePixelRatio, first.y * devicePixelRatio)
  for (let i = 1; i < stroke.points.length; i++) {
    const p0 = stroke.points[i - 1]
    const p1 = stroke.points[i]
    const midX = (p0.x + p1.x) / 2
    const midY = (p0.y + p1.y) / 2
    ctx.lineWidth = Math.max(1, (w * (p1.pressure || 0.5)) * devicePixelRatio)
    ctx.quadraticCurveTo(p0.x * devicePixelRatio, p0.y * devicePixelRatio, midX * devicePixelRatio, midY * devicePixelRatio)
  }
  ctx.stroke()
  ctx.restore()
}

const MobileCanvasView = forwardRef<MobileCanvasHandle, MobileCanvasViewProps>(
  ({ members, selfMemberId, onStrokeComplete, onUndo, onExitLandscape }, ref) => {
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
    const dprRef = useRef<number>(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // Drawing state
    const strokesRef = useRef<Stroke[]>([])
    const undoStackRef = useRef<Stroke[]>([])
    const redoStackRef = useRef<Stroke[]>([])
    const curStrokeRef = useRef<Stroke | null>(null)

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
    const [brushWidth, setBrushWidth] = useState(4)
    const [color, setColor] = useState('#ffffff')
    const [showMembers, setShowMembers] = useState(false)

    const maxStrokePoints = 5000
    const maxUndoSteps = 50

    // Lock to landscape orientation when component mounts
    useEffect(() => {
      const lockOrientation = async () => {
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }).lock('landscape')
          }
        } catch {
          console.log('Orientation lock not supported')
        }
      }
      lockOrientation()

      return () => {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock()
          }
        } catch { /* ignore */ }
      }
    }, [])

    // Prevent scroll
    useEffect(() => {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'

      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.height = ''
      }
    }, [])

    // Canvas resize
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr

      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctxRef.current = ctx
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      strokesRef.current.forEach(st => drawStrokeOnContext(ctx, st, dprRef.current))
    }, [])

    // Initialize canvas
    useEffect(() => {
      resizeCanvas()
      const ro = new ResizeObserver(() => resizeCanvas())
      if (containerRef.current) ro.observe(containerRef.current)
      window.addEventListener('orientationchange', resizeCanvas)
      return () => {
        ro.disconnect()
        window.removeEventListener('orientationchange', resizeCanvas)
      }
    }, [resizeCanvas])

    // Redraw canvas
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const dpr = dprRef.current
      strokesRef.current.forEach(st => drawStrokeOnContext(ctx, st, dpr))
      ctx.restore()
    }, [])

    // Get pointer position
    const getPointerPos = useCallback((ev: PointerEvent | Touch) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0, pressure: 1 }
      const rect = canvas.getBoundingClientRect()
      const x = ('clientX' in ev ? (ev as PointerEvent).clientX : (ev as Touch).clientX) - rect.left
      const y = ('clientY' in ev ? (ev as PointerEvent).clientY : (ev as Touch).clientY) - rect.top
      const pe = ev as PointerEvent
      const pressure = 'pressure' in pe && typeof pe.pressure === 'number' && !Number.isNaN(pe.pressure)
        ? pe.pressure
        : 1
      return { x, y, pressure: Math.max(0.01, Math.min(2, pressure)) }
    }, [])

    // Start stroke
    const beginStroke = useCallback((startPoint: Point) => {
      const id = uid()
      const st: Stroke = {
        id,
        tool,
        color,
        width: brushWidth,
        points: [startPoint],
        createdAt: Date.now(),
      }
      curStrokeRef.current = st
      redoStackRef.current = []
    }, [tool, color, brushWidth])

    // Continue stroke
    const continueStroke = useCallback((p: Point) => {
      const cur = curStrokeRef.current
      if (!cur) return
      if (cur.points.length >= maxStrokePoints) return
      const last = cur.points[cur.points.length - 1]
      if (last && last.x === p.x && last.y === p.y && last.pressure === p.pressure) return
      cur.points.push(p)

      const ctx = ctxRef.current
      if (ctx) {
        ctx.save()
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.globalCompositeOperation = cur.tool === 'eraser' ? 'destination-out' : 'source-over'
        ctx.strokeStyle = cur.tool === 'eraser' ? 'rgba(0,0,0,1)' : cur.color
        const dpr = dprRef.current
        const lastIndex = cur.points.length - 1
        if (lastIndex >= 1) {
          const p0 = cur.points[lastIndex - 1]
          const p1 = cur.points[lastIndex]
          ctx.beginPath()
          ctx.moveTo(p0.x * dpr, p0.y * dpr)
          ctx.lineWidth = Math.max(1, (cur.width * (p1.pressure || 0.5)) * dpr)
          ctx.quadraticCurveTo(p0.x * dpr, p0.y * dpr, ((p0.x + p1.x) / 2) * dpr, ((p0.y + p1.y) / 2) * dpr)
          ctx.stroke()
        }
        ctx.restore()
      }
    }, [])

    // End stroke
    const endStroke = useCallback(() => {
      const cur = curStrokeRef.current
      if (!cur) {
        return
      }
      strokesRef.current.push(cur)
      undoStackRef.current.push(cur)
      if (undoStackRef.current.length > maxUndoSteps) {
        undoStackRef.current.shift()
      }
      curStrokeRef.current = null
      if (onStrokeComplete) {
        onStrokeComplete(cur)
      }
    }, [onStrokeComplete])

    // Undo
    const undo = useCallback(() => {
      if (undoStackRef.current.length === 0) return
      const stroke = undoStackRef.current.pop()!
      redoStackRef.current.push(stroke)
      strokesRef.current = strokesRef.current.filter(st => st.id !== stroke.id)
      redrawCanvas()
      if (onUndo) {
        onUndo(stroke)
      }
    }, [onUndo, redrawCanvas])

    // Redo
    const redo = useCallback(() => {
      if (redoStackRef.current.length === 0) return
      const s = redoStackRef.current.pop()!
      strokesRef.current.push(s)
      undoStackRef.current.push(s)
      const ctx = ctxRef.current
      if (ctx) {
        drawStrokeOnContext(ctx, s, dprRef.current)
      }
    }, [])

    // Clear
    const clear = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
      strokesRef.current = []
      undoStackRef.current = []
      redoStackRef.current = []
    }, [])

    // Serialization
    const getSerialized = useCallback(() => {
      const payload = {
        width: 1200,
        height: 800,
        strokes: strokesRef.current,
        createdAt: Date.now(),
      }
      return JSON.stringify(payload)
    }, [])

    const loadSerialized = useCallback((json: string) => {
      try {
        const data = JSON.parse(json)
        if (!data || !Array.isArray(data.strokes)) return
        strokesRef.current = data.strokes.slice(0, 10000)
        undoStackRef.current = strokesRef.current.slice()
        redoStackRef.current = []
        redrawCanvas()
      } catch (err) {
        console.error('Failed to load canvas data', err)
      }
    }, [redrawCanvas])

    // Remote stroke handling
    const addRemoteStroke = useCallback((stroke: Stroke) => {
      if (!stroke || !Array.isArray(stroke.points)) return
      const normalized: Stroke = {
        id: stroke.id || Math.random().toString(36).slice(2, 10),
        tool: stroke.tool || 'pen',
        color: stroke.color || '#ffffff',
        width: stroke.width || 4,
        points: stroke.points.map(p => ({ ...p, pressure: p.pressure ?? 0.5 })),
        createdAt: stroke.createdAt || Date.now(),
      }

      const existingIndex = strokesRef.current.findIndex(st => st.id === normalized.id)
      if (existingIndex !== -1) {
        strokesRef.current[existingIndex] = normalized
        redrawCanvas()
        return
      }

      strokesRef.current.push(normalized)
      undoStackRef.current.push(normalized)
      const ctx = ctxRef.current
      if (ctx) {
        drawStrokeOnContext(ctx, normalized, dprRef.current)
      }
    }, [redrawCanvas])

    const removeStroke = useCallback((strokeId: string) => {
      if (!strokeId) return
      const initialLength = strokesRef.current.length
      if (!initialLength) return
      strokesRef.current = strokesRef.current.filter(st => st.id !== strokeId)
      undoStackRef.current = undoStackRef.current.filter(st => st.id !== strokeId)
      redoStackRef.current = redoStackRef.current.filter(st => st.id !== strokeId)
      if (strokesRef.current.length !== initialLength) {
        redrawCanvas()
      }
    }, [redrawCanvas])

    // Expose API via ref
    useImperativeHandle(ref, () => ({
      addRemoteStroke,
      loadSnapshot: loadSerialized,
      removeStroke,
      getSerialized,
    }), [addRemoteStroke, loadSerialized, removeStroke, getSerialized])

    // Pointer event handlers
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const onPointerDown = (ev: PointerEvent) => {
        if (ev.button && ev.button !== 0) return
        const pid = ev.pointerId
        ;(ev.target as Element).setPointerCapture?.(pid)
        const p = getPointerPos(ev)
        beginStroke({ x: p.x, y: p.y, pressure: p.pressure })
      }

      const onPointerMove = (ev: PointerEvent) => {
        if (!curStrokeRef.current) return
        const p = getPointerPos(ev)
        continueStroke({ x: p.x, y: p.y, pressure: p.pressure })
      }

      const onPointerUp = (ev: PointerEvent) => {
        try { (ev.target as Element).releasePointerCapture?.(ev.pointerId) } catch {}
        endStroke()
      }

      const onPointerCancel = (ev: PointerEvent) => {
        try { (ev.target as Element).releasePointerCapture?.(ev.pointerId) } catch {}
        curStrokeRef.current = null
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerCancel)

      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerCancel)
      }
    }, [beginStroke, continueStroke, endStroke, getPointerPos])

    const handleToolAction = (action: string) => {
      switch (action) {
        case 'pen':
          setTool('pen')
          break
        case 'eraser':
          setTool('eraser')
          break
        case 'undo':
          undo()
          break
        case 'redo':
          redo()
          break
        case 'clear':
          clear()
          break
      }
      if (['undo', 'redo', 'clear'].includes(action)) {
        setSidebarOpen(false)
      }
    }

    return (
      <div className="mobile-canvas-landscape">
        {/* Back Button */}
        <button
          onClick={onExitLandscape}
          className="mobile-canvas-back-btn"
          title="Exit Landscape Mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="ml-1 text-xs font-semibold">Exit</span>
        </button>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-canvas-sidebar-toggle"
          title="Open Tools"
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Sliding Sidebar */}
        <div className={`mobile-canvas-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="mobile-canvas-sidebar-content">
            {/* Tools Section */}
            <div className="sidebar-section">
              <span className="sidebar-label">Tools</span>
              <div className="sidebar-tools">
                <button
                  onClick={() => handleToolAction('pen')}
                  className={`sidebar-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                  title="Pen"
                >
                  <span className="text-lg">✏️</span>
                  <span className="text-[10px]">Pen</span>
                </button>
                <button
                  onClick={() => handleToolAction('eraser')}
                  className={`sidebar-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                  title="Eraser"
                >
                  <span className="text-lg">🧽</span>
                  <span className="text-[10px]">Erase</span>
                </button>
              </div>
            </div>

            {/* Size Slider */}
            <div className="sidebar-section">
              <span className="sidebar-label">Size: {brushWidth}</span>
              <input
                type="range"
                min={1}
                max={64}
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="sidebar-slider"
              />
            </div>

            {/* Color Picker */}
            <div className="sidebar-section">
              <span className="sidebar-label">Color</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="sidebar-color-picker"
              />
            </div>

            {/* Actions */}
            <div className="sidebar-section">
              <span className="sidebar-label">Actions</span>
              <div className="sidebar-actions">
                <button
                  onClick={() => handleToolAction('undo')}
                  className="sidebar-action-btn"
                  title="Undo"
                >
                  <span>↶</span>
                  <span className="text-[10px]">Undo</span>
                </button>
                <button
                  onClick={() => handleToolAction('redo')}
                  className="sidebar-action-btn"
                  title="Redo"
                >
                  <span>↷</span>
                  <span className="text-[10px]">Redo</span>
                </button>
                <button
                  onClick={() => handleToolAction('clear')}
                  className="sidebar-action-btn danger"
                  title="Clear"
                >
                  <span>🗑️</span>
                  <span className="text-[10px]">Clear</span>
                </button>
              </div>
            </div>

            {/* Members Toggle */}
            <div className="sidebar-section">
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="sidebar-members-toggle"
              >
                <span>👥</span>
                <span className="text-xs">Members ({members.length})</span>
                <svg className={`w-4 h-4 transition-transform ${showMembers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMembers && (
                <div className="sidebar-members-list">
                  <MemberList members={members} selfMemberId={selfMemberId} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Container - Full screen */}
        <div ref={containerRef} className="mobile-canvas-container">
          <canvas
            ref={canvasRef}
            className="mobile-canvas-element"
            style={{
              touchAction: 'none',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* Overlay backdrop when sidebar is open */}
        {sidebarOpen && (
          <div
            className="mobile-canvas-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    )
  }
)

MobileCanvasView.displayName = 'MobileCanvasView'

// Landscape prompt overlay component
export function LandscapePrompt({ onEnterLandscape }: { onEnterLandscape: () => void }) {
  return (
    <div className="landscape-prompt">
      <div className="landscape-prompt-card">
        <div className="landscape-prompt-icon">
          <svg className="w-16 h-16 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div className="landscape-prompt-rotate-icon">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
        <h3 className="landscape-prompt-title">Better Canvas Experience</h3>
        <p className="landscape-prompt-text">
          For the best drawing experience on mobile, we recommend using landscape mode with our optimized mobile interface.
        </p>
        <button
          onClick={onEnterLandscape}
          className="landscape-prompt-btn"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Open in Landscape Mode
        </button>
        <p className="landscape-prompt-hint">
          Tap to enter fullscreen landscape view with easy-access tools
        </p>
      </div>
    </div>
  )
}

export default MobileCanvasView
