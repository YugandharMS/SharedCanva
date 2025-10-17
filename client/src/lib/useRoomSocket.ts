'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { socketClient } from './socket'
import type { Member, RoomJoinedPayload } from '@/types'
import type { Stroke } from '@/components/canvas'
import type { UserProfile } from './profile'

type MemberWire = {
  memberId?: string
  clientId?: string
  displayName?: string
  avatar?: string
  isHost?: boolean
  joinedAt?: number
  status?: 'online' | 'offline'
}

interface RoomMembersPayload {
  members?: MemberWire[]
}

interface JoinRoomAck {
  success: boolean
  error?: string
  roomCode?: string
  isHost?: boolean
  members?: MemberWire[]
  self?: MemberWire | null
}

type CreateRoomParams = {
  password?: string
  profile?: UserProfile
}

type JoinRoomParams = {
  code: string
  password?: string
  profile?: UserProfile
}

const memberSort = (a: Member, b: Member) => {
  if (a.isHost && !b.isHost) return -1
  if (!a.isHost && b.isHost) return 1
  if (a.status !== b.status) return a.status === 'online' ? -1 : 1
  if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt
  return a.displayName.localeCompare(b.displayName)
}

const toMember = (wire: MemberWire): Member | null => {
  if (!wire) return null
  const memberId = typeof wire.memberId === 'string' && wire.memberId.trim().length > 0
    ? wire.memberId.trim()
    : (typeof wire.clientId === 'string' && wire.clientId.trim().length > 0
      ? `${wire.clientId.trim()}-${wire.joinedAt ?? Date.now()}`
      : '')
  if (!memberId) return null
  const clientId = typeof wire.clientId === 'string' && wire.clientId.trim().length > 0
    ? wire.clientId.trim()
    : memberId
  const displayName = typeof wire.displayName === 'string' && wire.displayName.trim().length > 0
    ? wire.displayName.trim().slice(0, 80)
    : 'Guest'
  const avatar = typeof wire.avatar === 'string' && wire.avatar.trim().length > 0
    ? wire.avatar.slice(0, 4)
    : '🙂'
  const joinedAt = typeof wire.joinedAt === 'number' ? wire.joinedAt : Date.now()
  const status = wire.status === 'offline' ? 'offline' : 'online'
  return {
    memberId,
    clientId,
    displayName,
    avatar,
    isHost: !!wire.isHost,
    joinedAt,
    status,
  }
}

const mapMembers = (list?: MemberWire[]): Member[] => {
  if (!Array.isArray(list)) return []
  const result: Member[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const member = toMember(item)
    if (!member) continue
    if (seen.has(member.memberId)) continue
    seen.add(member.memberId)
    result.push(member)
  }
  return result.sort(memberSort)
}

export function useRoomSocket(roomCode?: string, {
  onStrokeReceived,
  onStrokeRemoved,
  onCanvasSnapshot,
}: {
  onStrokeReceived?: (stroke: Stroke) => void
  onStrokeRemoved?: (strokeId: string) => void
  onCanvasSnapshot?: (snapshot: string) => void
} = {}) {
  const [connected, setConnected] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selfMember, setSelfMember] = useState<Member | null>(null)
  const selfMemberIdRef = useRef<string | null>(null)
  const selfClientIdRef = useRef<string | null>(null)

  useEffect(() => {
    const s = socketClient.connect()

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    const handleMembers = (payload: RoomMembersPayload) => {
      const nextMembers = mapMembers(payload?.members)
      setMembers(nextMembers)
      const memberId = selfMemberIdRef.current
      const clientId = selfClientIdRef.current
      let nextSelf: Member | null = null
      if (memberId) {
        nextSelf = nextMembers.find(member => member.memberId === memberId) || null
      }
      if (!nextSelf && clientId) {
        nextSelf = nextMembers.find(member => member.clientId === clientId) || null
      }
      setSelfMember(nextSelf)
    }

    const historyHandler = (history: unknown) => {
      if (!Array.isArray(history) || !onStrokeReceived) return
      for (const stroke of history) {
        onStrokeReceived(stroke as Stroke)
      }
    }

    const undoHandler = (payload: { strokeId?: string }) => {
      if (!payload?.strokeId || !onStrokeRemoved) return
      onStrokeRemoved(payload.strokeId)
    }

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)
    s.on('room:members', handleMembers)

    if (onStrokeReceived) {
      s.on('canvas:stroke', onStrokeReceived)
    }
    if (onCanvasSnapshot) {
      s.on('canvas:snapshot', onCanvasSnapshot)
    }
    s.on('canvas:history', historyHandler)
    if (onStrokeRemoved) {
      s.on('canvas:undo', undoHandler)
    }

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
      s.off('room:members', handleMembers)
      if (onStrokeReceived) s.off('canvas:stroke', onStrokeReceived)
      if (onCanvasSnapshot) s.off('canvas:snapshot', onCanvasSnapshot)
      s.off('canvas:history', historyHandler)
      if (onStrokeRemoved) s.off('canvas:undo', undoHandler)
    }
  }, [onCanvasSnapshot, onStrokeReceived, onStrokeRemoved])

  const createRoom = useCallback(
    ({ password, profile }: CreateRoomParams = {}) =>
      new Promise<RoomJoinedPayload>((resolve, reject) => {
        const s = socketClient.connect()
        s.emit('create-room', { password: password ?? '', profile }, (res: JoinRoomAck) => {
          if (!res?.success || !res.roomCode) {
            return reject(new Error(res?.error || 'create-room failed'))
          }
          const mappedMembers = mapMembers(res.members)
          setMembers(mappedMembers)
          const fallbackSelf = res.self ? toMember(res.self) : null
          selfMemberIdRef.current = fallbackSelf?.memberId || null
          selfClientIdRef.current = profile?.clientId || fallbackSelf?.clientId || null
          if (selfMemberIdRef.current) {
            const match = mappedMembers.find(member => member.memberId === selfMemberIdRef.current)
            setSelfMember(match || fallbackSelf || null)
          } else if (selfClientIdRef.current) {
            const match = mappedMembers.find(member => member.clientId === selfClientIdRef.current)
            setSelfMember(match || fallbackSelf || null)
          } else {
            setSelfMember(fallbackSelf || null)
          }
          resolve({
            roomCode: res.roomCode,
            isHost: !!res.isHost,
            members: mappedMembers,
            self: fallbackSelf,
          })
        })
      }),
    []
  )

  const joinRoom = useCallback(
    ({ code, password, profile }: JoinRoomParams) =>
      new Promise<RoomJoinedPayload>((resolve, reject) => {
        if (!code) {
          reject(new Error('Room code is required'))
          return
        }
        const s = socketClient.connect()
        s.emit('join-room', { code, password, profile }, (res: JoinRoomAck) => {
          if (!res?.success || !res.roomCode) {
            return reject(new Error(res?.error || 'join-room failed'))
          }
          const mappedMembers = mapMembers(res.members)
          setMembers(mappedMembers)
          const fallbackSelf = res.self ? toMember(res.self) : null
          selfMemberIdRef.current = fallbackSelf?.memberId || null
          selfClientIdRef.current = profile?.clientId || fallbackSelf?.clientId || null
          if (selfMemberIdRef.current) {
            const match = mappedMembers.find(member => member.memberId === selfMemberIdRef.current)
            setSelfMember(match || fallbackSelf || null)
          } else if (selfClientIdRef.current) {
            const match = mappedMembers.find(member => member.clientId === selfClientIdRef.current)
            setSelfMember(match || fallbackSelf || null)
          } else {
            setSelfMember(fallbackSelf || null)
          }
          resolve({
            roomCode: res.roomCode,
            isHost: !!res.isHost,
            members: mappedMembers,
            self: fallbackSelf,
          })
        })
      }),
    []
  )

  const emitStroke = useCallback((code: string, stroke: Stroke) => {
    if (!code) return
    const s = socketClient.connect()
    const payload = {
      roomCode: code,
      stroke: {
        ...stroke,
        size: (stroke as Stroke & { size?: number }).size ?? stroke.width,
      },
    }
    s.emit('canvas:stroke', payload)
  }, [])

  const emitUndo = useCallback((code: string, strokeId: string) => {
    if (!code || !strokeId) return
    socketClient.connect().emit('canvas:undo', { roomCode: code, strokeId })
  }, [])

  const emitSaveSnapshot = useCallback((code: string, snapshot: string) => {
    if (!code || !snapshot) return
    socketClient.connect().emit('canvas:save-snapshot', { roomCode: code, snapshot })
  }, [])

  const requestSnapshot = useCallback((code: string) => {
    if (!code) return
    socketClient.connect().emit('canvas:request-snapshot', { roomCode: code })
  }, [])

  return {
    connected,
    members,
    selfMember,
    createRoom,
    joinRoom,
    emitStroke,
    emitUndo,
    emitSaveSnapshot,
    requestSnapshot,
  }
}
