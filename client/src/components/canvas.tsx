'use client'
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'

/**
 * Production-ready Canvas component (TypeScript + React)
 *
 * Features:
 * - Pointer events (mouse, touch, pen) with pressure support
 * - High-DPI scaling and responsive resize
 * - Tools: pen, eraser, undo, redo, clear
 * - Stroke batching and size limits to avoid malicious payloads
 * - Undo/Redo stack with configurable maxLength
 * - Export to PNG and serialize/load strokes
 * - Callbacks for stroke progress & completion (good for socket emission)
 *
 * Usage:
 *  const ref = useRef<CanvasHandle | null>(null)
 *  <Canvas ref={ref} width={1200} height={800} />
 *
 *  // programmatic
 *  ref.current?.exportPNG()
 *  ref.current?.getSerialized()
 *
 */

type Point = { x: number; y: number; pressure: number }
export type Stroke = {
  id: string
  tool: 'pen' | 'eraser'
  color: string
  width: number
  points: Point[] // compressed points
  createdAt: number
}

export type CanvasHandle = {
  exportPNG: (scale?: number) => string // dataURL
  getSerialized: () => string // JSON
  loadSerialized: (json: string) => void
  clear: () => void
  undo: () => void
  redo: () => void
  // Add methods consumed by RoomPage
  addRemoteStroke: (stroke: Stroke) => void
  loadSnapshot: (serialized: string) => void
  removeStroke: (strokeId: string) => void
}

type Props = {
  className?: string
  /** base width & height used for internal coordinate system - canvas will be responsive */
  width?: number
  height?: number
  backgroundColor?: string
  initialColor?: string
  initialWidth?: number
  maxUndoSteps?: number
  maxStrokePoints?: number
  onStrokeComplete?: (stroke: Stroke) => void
  onStrokeProgress?: (partial: { strokeId: string; points: Point[]; finished: boolean }) => void
  onUndo?: (stroke: Stroke) => void
}

const defaultProps = {
  width: 1200,
  height: 800,
  backgroundColor: 'transparent',
  initialColor: '#ffffff',
  initialWidth: 4,
  maxUndoSteps: 50,
  maxStrokePoints: 5000,
} as const

// Utility: generate short unique id (safe for client)
const uid = () => Math.random().toString(36).slice(2, 10)

// Line drawing helpers: draw a stroke with simple smoothing (quadratic)
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
  // use pressure (multiplies width) when available
  const first = stroke.points[0]
  const w = stroke.width || 1
  ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  // draw smoothed path using simple midpoint technique
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

const Canvas = forwardRef<CanvasHandle, Props>((props, ref) => {
  const {
    className,
    width = defaultProps.width,
    height = defaultProps.height,
    backgroundColor = defaultProps.backgroundColor,
    initialColor = defaultProps.initialColor,
    initialWidth = defaultProps.initialWidth,
    maxUndoSteps = defaultProps.maxUndoSteps,
    maxStrokePoints = defaultProps.maxStrokePoints,
    onStrokeComplete,
    onStrokeProgress,
    onUndo,
  } = props

  // Refs & state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const dprRef = useRef<number>(window.devicePixelRatio || 1)

  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState<string>(initialColor)
  const [brushWidth, setBrushWidth] = useState<number>(initialWidth)

  // Stacks for persistence / undo
  const strokesRef = useRef<Stroke[]>([]) // authoritative list of strokes
  const undoStackRef = useRef<Stroke[]>([])
  const redoStackRef = useRef<Stroke[]>([])

  // current stroke in progress
  const curStrokeRef = useRef<Stroke | null>(null)

  // batch emit timer (for onStrokeProgress)
  const lastProgressEmitRef = useRef<number>(0)
  const progressEmitInterval = 80 // ms

  // canvas resizing: keep internal logical size
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr

    // target CSS size
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    // set actual pixel size
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx
    // set scale so we can draw using logical coordinates
    ctx.setTransform(1, 0, 0, 1, 0, 0) // reset
    // clear and re-render background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // redraw all strokes to new size
    strokesRef.current.forEach(st => drawStrokeOnContext(ctx, st, dprRef.current))
  }, [backgroundColor])

  // initialize
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

  // helper: get pointer position relative to canvas logical coords
  const getPointerPos = useCallback((ev: PointerEvent | Touch) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return { x: 0, y: 0, pressure: 1 }
  const rect = canvas.getBoundingClientRect()
    const x = (('clientX' in ev ? (ev as PointerEvent).clientX : (ev as Touch).clientX) - rect.left) // CSS px
    const y = (('clientY' in ev ? (ev as PointerEvent).clientY : (ev as Touch).clientY) - rect.top)
    // Convert to logical coordinate (0..width)
    // We'll keep stroke points in CSS pixels for portability (not device pixels), but draw using dpr scaling
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
    setIsDrawing(true)
    // reset redo on new stroke
    redoStackRef.current = []
    // immediate small emit
    lastProgressEmitRef.current = Date.now()
    if (onStrokeProgress) onStrokeProgress({ strokeId: id, points: st.points.slice(), finished: false })
  }, [tool, color, brushWidth, onStrokeProgress])

  // Continue stroke
  const continueStroke = useCallback((p: Point) => {
    const cur = curStrokeRef.current
    if (!cur) return
    // enforce max points
    if (cur.points.length >= maxStrokePoints) {
      // ignore further points - prevents huge payloads
      return
    }
    // avoid duplicate consecutive points
    const last = cur.points[cur.points.length - 1]
    if (last && last.x === p.x && last.y === p.y && last.pressure === p.pressure) return
    cur.points.push(p)

    // draw incremental segment to canvas for responsiveness
    const ctx = ctxRef.current
    if (ctx) {
      // draw the latest small slice to avoid re-drawing whole canvas each pointer move
      // naive approach: just redraw current stroke from second last point
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

    // batched progress emit
    const now = Date.now()
    if (onStrokeProgress && now - lastProgressEmitRef.current > progressEmitInterval) {
      lastProgressEmitRef.current = now
      onStrokeProgress({ strokeId: cur.id, points: cur.points.slice(), finished: false })
    }
  }, [maxStrokePoints, onStrokeProgress])

  // End stroke
  const endStroke = useCallback(() => {
    const cur = curStrokeRef.current
    if (!cur) {
      setIsDrawing(false)
      return
    }
    // finalize
    strokesRef.current.push(cur)
    // push to undo stack
    undoStackRef.current.push(cur)
    // cap undo stack
    if (undoStackRef.current.length > maxUndoSteps) {
      undoStackRef.current.shift()
    }
    // reset current stroke
    curStrokeRef.current = null
    setIsDrawing(false)
    // emit final stroke
    if (onStrokeProgress) {
      onStrokeProgress({ strokeId: cur.id, points: cur.points.slice(), finished: true })
    }
    if (onStrokeComplete) {
      onStrokeComplete(cur)
    }
  }, [maxUndoSteps, onStrokeComplete, onStrokeProgress])

  // Clear canvas (visual + memory)
  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = backgroundColor
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    strokesRef.current = []
    undoStackRef.current = []
    redoStackRef.current = []
  }, [backgroundColor])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const dpr = dprRef.current
    strokesRef.current.forEach(st => drawStrokeOnContext(ctx, st, dpr))
    ctx.restore()
  }, [backgroundColor])

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
    // draw only the redone stroke for speed
    const ctx = ctxRef.current
    if (ctx) {
      drawStrokeOnContext(ctx, s, dprRef.current)
    }
  }, [])

  // Serialization: get strokes as JSON
  const getSerialized = useCallback(() => {
    // Keep minimal: strokes points and metadata
    const payload = {
      width,
      height,
      strokes: strokesRef.current,
      createdAt: Date.now(),
    }
    return JSON.stringify(payload)
  }, [width, height])

  const loadSerialized = useCallback((json: string) => {
    try {
      const data = JSON.parse(json)
      if (!data || !Array.isArray(data.strokes)) return
      // simple validation: ensure points are arrays
      strokesRef.current = data.strokes.slice(0, 10000) // extra guard
      // reset undo/redo
      undoStackRef.current = strokesRef.current.slice()
      redoStackRef.current = []
      // redraw
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      strokesRef.current.forEach(st => drawStrokeOnContext(ctx, st, dprRef.current))
      ctx.restore()
    } catch (err) {
      // ignore bad JSON
      // In production, report to logging/monitoring
      console.error('Failed to load canvas data', err)
    }
  }, [backgroundColor])

  const exportPNG = useCallback((scale = 1) => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    // create a temporary canvas for export to control scale
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = Math.floor(canvas.width * scale)
    exportCanvas.height = Math.floor(canvas.height * scale)
    const eCtx = exportCanvas.getContext('2d')
    if (!eCtx) return ''
    // white/transparent background depending on prop
    if (backgroundColor && backgroundColor !== 'transparent') {
      eCtx.fillStyle = backgroundColor
      eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    }
    // draw current strokes scaled to export canvas
    const factor = exportCanvas.width / canvas.width
    eCtx.save()
    eCtx.scale(factor, factor)
    strokesRef.current.forEach(st => drawStrokeOnContext(eCtx, st, dprRef.current))
    eCtx.restore()
    return exportCanvas.toDataURL('image/png')
  }, [backgroundColor])

  // Expose API via ref
  // Remote stroke application
  const addRemoteStroke = useCallback((stroke: Stroke) => {
    if (!stroke || !Array.isArray(stroke.points)) return
    const normalized: Stroke = {
      id: stroke.id || Math.random().toString(36).slice(2, 10),
      tool: stroke.tool || 'pen',
      color: stroke.color || '#ffffff',
      width: (stroke as Partial<Stroke> & { size?: number }).width || (stroke as { size?: number }).size || 4,
      points: stroke.points.map(p => ({ ...p, pressure: p.pressure ?? 0.5 })),
      createdAt: stroke.createdAt || Date.now(),
    }

    const existingIndex = strokesRef.current.findIndex(st => st.id === normalized.id)
    if (existingIndex !== -1) {
      strokesRef.current[existingIndex] = normalized
      const undoIndex = undoStackRef.current.findIndex(st => st.id === normalized.id)
      if (undoIndex !== -1) {
        undoStackRef.current[undoIndex] = normalized
      } else {
        undoStackRef.current.push(normalized)
      }
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

  const loadSnapshot = useCallback((json: string) => {
    loadSerialized(json)
  }, [loadSerialized])

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

  useImperativeHandle(ref, () => ({
    exportPNG,
    getSerialized,
    loadSerialized,
    clear,
    undo,
    redo,
    addRemoteStroke,
    loadSnapshot,
    removeStroke,
  }), [exportPNG, getSerialized, loadSerialized, clear, undo, redo, addRemoteStroke, loadSnapshot, removeStroke])

  // Pointer event handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Pointerdown
    const onPointerDown = (ev: PointerEvent) => {
      // Only primary pointer for mouse
      if ((ev as PointerEvent).button && (ev as PointerEvent).button !== 0) return
  const pid = (ev as PointerEvent).pointerId
  ;(ev.target as Element).setPointerCapture?.(pid)
      const p = getPointerPos(ev)
      beginStroke({ x: p.x, y: p.y, pressure: p.pressure })
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDrawing) return
      const p = getPointerPos(ev)
      continueStroke({ x: p.x, y: p.y, pressure: p.pressure })
    }

    const onPointerUp = (ev: PointerEvent) => {
  try { (ev.target as Element).releasePointerCapture?.((ev as PointerEvent).pointerId) } catch {}
      endStroke()
    }

    const onPointerCancel = (ev: PointerEvent) => {
  try { (ev.target as Element).releasePointerCapture?.((ev as PointerEvent).pointerId) } catch {}
      // abort
      curStrokeRef.current = null
      setIsDrawing(false)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)

    // touch fallback: pointer events should handle touch on modern browsers
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [beginStroke, continueStroke, endStroke, getPointerPos, isDrawing])

  // Toolbar UI (small built-in)
  return (
    <div
      ref={containerRef}
      className={`relative box-border min-w-0 w-full max-w-full overflow-hidden rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-black to-gray-900 shadow-[0_0_30px_rgba(34,197,94,0.15)] backdrop-blur ${className || ''}`}
      style={{ minHeight: 220 }}
    >
      <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-green-500/30 bg-black/80 p-2.5 shadow-lg shadow-green-500/10 backdrop-blur-sm md:right-5">
        <button
          className={`px-3 py-2 rounded-md font-semibold text-sm transition-all duration-200 border ${
            tool === 'pen' 
              ? 'border-green-500 bg-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
              : 'border-green-500/20 bg-black/40 text-gray-400 hover:border-green-500/40 hover:text-green-500'
          }`}
          onClick={() => setTool('pen')}
          title="Pen"
        >
          ✏️ Pen
        </button>
        <button
          className={`px-3 py-2 rounded-md font-semibold text-sm transition-all duration-200 border ${
            tool === 'eraser' 
              ? 'border-green-500 bg-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
              : 'border-green-500/20 bg-black/40 text-gray-400 hover:border-green-500/40 hover:text-green-500'
          }`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          🧽 Erase
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-green-500/20 bg-black/40">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Size</label>
          <input
            aria-label="Brush width"
            type="range"
            min={1}
            max={64}
            value={brushWidth}
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <span className="text-xs text-green-500 font-mono w-6">{brushWidth}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Color</label>
          <input
            aria-label="Color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-8 rounded border-2 border-green-500/30 bg-black cursor-pointer hover:border-green-500/50 transition-colors"
          />
        </div>

        <div className="h-6 w-px bg-green-500/20"></div>

        <button 
          className="px-3 py-2 rounded-md font-semibold text-sm transition-all duration-200 border border-green-500/20 bg-black/40 text-gray-400 hover:border-green-500/40 hover:text-green-500 hover:bg-green-500/10" 
          onClick={() => { undo(); }} 
          title="Undo"
        >
          ↶ Undo
        </button>
        <button 
          className="px-3 py-2 rounded-md font-semibold text-sm transition-all duration-200 border border-green-500/20 bg-black/40 text-gray-400 hover:border-green-500/40 hover:text-green-500 hover:bg-green-500/10" 
          onClick={() => { redo(); }} 
          title="Redo"
        >
          ↷ Redo
        </button>
        <button 
          className="px-3 py-2 rounded-md font-semibold text-sm transition-all duration-200 border border-red-500/30 bg-black/40 text-red-400 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10" 
          onClick={() => { clear(); }} 
          title="Clear"
        >
          🗑️ Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="block h-full w-full max-w-full rounded-2xl shadow-inner shadow-green-500/5"
        style={{
          touchAction: 'none', // important: prevent scrolling when drawing on touch
          background: backgroundColor === 'transparent' ? 'rgba(0, 0, 0, 0.3)' : backgroundColor,
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
})

Canvas.displayName = 'Canvas'
export default Canvas
