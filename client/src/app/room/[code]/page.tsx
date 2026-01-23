'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRoomSocket } from '@/lib/useRoomSocket'
import MemberList from '@/components/MemberList'
import Canvas, { CanvasHandle, Stroke } from '@/components/canvas'
import MobileCanvasView, { LandscapePrompt, MobileCanvasHandle } from '@/components/MobileCanvasView'
import { useUserProfile } from '@/lib/profile'

// Hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile((mobileRegex.test(userAgent.toLowerCase()) || isTouchDevice) && isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { profile, ready: profileReady } = useUserProfile()
  const joinAttemptedRef = useRef(false)
  const canvasRef = useRef<CanvasHandle>(null)
  const mobileCanvasRef = useRef<MobileCanvasHandle>(null)
  const [rosterOpen, setRosterOpen] = useState(false)
  
  // Mobile-specific state
  const isMobile = useIsMobile()
  const [isLandscapeMode, setIsLandscapeMode] = useState(false)

  // Store isLandscapeMode in a ref so callbacks can access the current value
  const isLandscapeModeRef = useRef(isLandscapeMode)
  useEffect(() => {
    isLandscapeModeRef.current = isLandscapeMode
  }, [isLandscapeMode])

  const {
    connected,
    members,
    selfMember,
    joinRoom,
    emitStroke,
    emitUndo,
    emitSaveSnapshot,
    requestSnapshot,
  } = useRoomSocket(code, {
    onStrokeReceived: (stroke: Stroke) => {
      canvasRef.current?.addRemoteStroke(stroke)
      // Also update mobile canvas if in landscape mode
      if (isLandscapeModeRef.current) {
        mobileCanvasRef.current?.addRemoteStroke(stroke)
      }
    },
    onStrokeRemoved: (strokeId: string) => {
      canvasRef.current?.removeStroke(strokeId)
      // Also update mobile canvas if in landscape mode
      if (isLandscapeModeRef.current) {
        mobileCanvasRef.current?.removeStroke(strokeId)
      }
    },
    onCanvasSnapshot: (snapshot: string) => {
      if (!snapshot) return
      if (snapshot.trim().startsWith('{')) {
        canvasRef.current?.loadSnapshot(snapshot)
        // Also update mobile canvas if in landscape mode
        if (isLandscapeModeRef.current) {
          mobileCanvasRef.current?.loadSnapshot(snapshot)
        }
      } else if (snapshot.startsWith('data:image/')) {
        // base64 fallbacks ignored for now
      }
    },
  })

  useEffect(() => {
    joinAttemptedRef.current = false
  }, [code])

  useEffect(() => {
    if (!code || !profileReady || !profile) return
    if (joinAttemptedRef.current) return
    joinAttemptedRef.current = true
    joinRoom({ code, profile })
      .then(() => {
        requestSnapshot(code)
      })
      .catch(() => router.replace('/?e=join'))
  }, [code, profileReady, profile, joinRoom, requestSnapshot, router])

  const onlineLabel = connected ? 'Connected' : 'Reconnecting'
  const connectionDot = connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-amber-500 animate-pulse'
  const memberCount = members.length
  const currentMemberId = selfMember?.memberId ?? null

  // Handle stroke completion for mobile canvas
  const handleMobileStrokeComplete = (stroke: Stroke) => {
    if (!code) return
    emitStroke(code, stroke)
    requestAnimationFrame(() => {
      const serialized = mobileCanvasRef.current?.getSerialized()
      if (serialized) {
        emitSaveSnapshot(code, serialized)
      }
    })
  }

  // Handle undo for mobile canvas
  const handleMobileUndo = (stroke: Stroke) => {
    if (!code || !stroke?.id) return
    emitUndo(code, stroke.id)
    requestAnimationFrame(() => {
      const serialized = mobileCanvasRef.current?.getSerialized()
      if (serialized) {
        emitSaveSnapshot(code, serialized)
      }
    })
  }

  // Enter landscape mode - sync canvas state
  const enterLandscapeMode = () => {
    setIsLandscapeMode(true)
    // After a short delay, load the current canvas state into mobile canvas
    setTimeout(() => {
      const serialized = canvasRef.current?.getSerialized()
      if (serialized) {
        mobileCanvasRef.current?.loadSnapshot(serialized)
      }
    }, 100)
  }

  // Exit landscape mode - sync state back to main canvas
  const exitLandscapeMode = () => {
    // Sync mobile canvas state back to main canvas before exiting
    const serialized = mobileCanvasRef.current?.getSerialized()
    if (serialized) {
      canvasRef.current?.loadSnapshot(serialized)
    }
    setIsLandscapeMode(false)
  }

  // Render mobile landscape view if active
  if (isMobile && isLandscapeMode) {
    return (
      <MobileCanvasView
        ref={mobileCanvasRef}
        members={members}
        selfMemberId={currentMemberId}
        onStrokeComplete={handleMobileStrokeComplete}
        onUndo={handleMobileUndo}
        onExitLandscape={exitLandscapeMode}
      />
    )
  }

  return (
    <div className="app-container py-6 space-y-6">
  <div className="flex min-w-0 flex-col gap-6 xl:flex-row">
        <aside className="hidden xl:block xl:w-80 animate-slide-in">
          <div className="card sticky top-6 space-y-4 hover:border-green-500/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <h2 className="text-lg font-bold neon-text">Room {String(code)}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">Share this code to invite collaborators</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5">
                <span className={`h-2 w-2 rounded-full ${connectionDot}`} aria-hidden="true" />
                <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">{onlineLabel}</span>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <MemberList members={members} selfMemberId={currentMemberId} />
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 animate-fade-in">
          <div className="card min-w-0 flex min-h-[60vh] flex-col overflow-hidden p-0 hover:border-green-500/40 transition-all duration-300">
            <header className="flex flex-col gap-4 border-b border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-green-500">Collaborative Canvas</h2>
                    <p className="text-xs text-gray-500">{memberCount} active member{memberCount === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5">
                  <span className={`h-2 w-2 rounded-full ${connectionDot}`} aria-hidden="true" />
                  <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">{onlineLabel}</span>
                </div>
                <button
                  type="button"
                  className="btn px-4 py-2 text-sm sm:hidden"
                  onClick={() => setRosterOpen(prev => !prev)}
                >
                  {rosterOpen ? '✕ Hide' : '👥 Show'} Members ({memberCount})
                </button>
              </div>
            </header>

            {rosterOpen && (
              <div className="border-b border-green-500/20 bg-black/40 px-5 py-4 sm:hidden animate-slide-in">
                <MemberList members={members} selfMemberId={currentMemberId} />
              </div>
            )}

            <div className="min-w-0 flex-1 p-4 sm:p-6 bg-gradient-to-br from-transparent to-green-500/5">
              {/* Show landscape prompt for mobile users */}
              {isMobile && (
                <LandscapePrompt onEnterLandscape={enterLandscapeMode} />
              )}
              
              {/* Main canvas - hidden on mobile, shown on desktop */}
              <Canvas
                ref={canvasRef}
                className={`h-[58vh] min-h-[20rem] sm:h-[70vh] ${isMobile ? 'hidden' : ''}`}
                onStrokeComplete={(stroke: Stroke) => {
                  if (!code) return
                  emitStroke(code, stroke)
                  requestAnimationFrame(() => {
                    const serialized = canvasRef.current?.getSerialized()
                    if (serialized) {
                      emitSaveSnapshot(code, serialized)
                    }
                  })
                }}
                onUndo={(stroke: Stroke) => {
                  if (!code || !stroke?.id) return
                  emitUndo(code, stroke.id)
                  requestAnimationFrame(() => {
                    const serialized = canvasRef.current?.getSerialized()
                    if (serialized) {
                      emitSaveSnapshot(code, serialized)
                    }
                  })
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
