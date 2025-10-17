// server/src/rooms.ts
import { randomUUID } from 'crypto'
export type MemberStatus = 'online' | 'offline'

export interface Member {
  memberId: string
  socketId: string
  clientId: string
  displayName: string
  avatar: string
  isHost: boolean
  joinedAt: number
  status: MemberStatus
  lastSeen: number
}

export interface MemberSnapshot {
  memberId: string
  clientId: string
  displayName: string
  avatar: string
  isHost: boolean
  joinedAt: number
  status: MemberStatus
}

export interface Room {
  code: string;
  // Optional password hash; undefined when room is not protected
  passwordHash?: string | undefined;
  members: Member[];
  createdAt: number;
  lastActive: number;
  history: any[];
  // Canvas and diagram data start as null until populated
  canvasData: any | null;
  diagramData: any | null;
}

class RoomStore {
  private rooms: Map<string, Room> = new Map();

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  createRoom(passwordHash?: string): Room {
    // ensure uniqueness (very low collision chance, but guard anyway)
    let code: string;
    do {
      code = this.generateCode();
    } while (this.rooms.has(code));
    const room: Room = {
      code,
      passwordHash,
      members: [],
      createdAt: Date.now(),
      lastActive: Date.now(),
      history: [],
      canvasData: null,
      diagramData: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  listRooms(): IterableIterator<[string, Room]> {
    return this.rooms.entries();
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }

  upsertMember(code: string, payload: {
    socketId: string
    clientId: string
    displayName: string
    avatar: string
    isHost?: boolean
  }): Member | null {
    const room = this.rooms.get(code)
    if (!room) return null
    const now = Date.now()
    const bySocket = room.members.find(member => member.socketId === payload.socketId)
    if (bySocket) {
      bySocket.displayName = payload.displayName
      bySocket.avatar = payload.avatar
      if (typeof payload.isHost === 'boolean') {
        bySocket.isHost = payload.isHost || bySocket.isHost
      }
      bySocket.status = 'online'
      bySocket.lastSeen = now
      room.lastActive = now
      return bySocket
    }

    const hasHost = room.members.some(member => member.isHost)
    const member: Member = {
      memberId: randomUUID(),
      socketId: payload.socketId,
      clientId: payload.clientId,
      displayName: payload.displayName,
      avatar: payload.avatar,
      isHost: typeof payload.isHost === 'boolean' ? payload.isHost : !hasHost,
      joinedAt: now,
      status: 'online',
      lastSeen: now,
    }
    room.members.push(member)
    room.lastActive = now
    return member
  }

  removeMemberBySocketId(code: string, socketId: string): Member | null {
    const room = this.rooms.get(code)
    if (!room) return null
    const index = room.members.findIndex(m => m.socketId === socketId)
    if (index === -1) return null
    const removed = room.members.splice(index, 1)[0]
    if (removed && removed.isHost && room.members.length > 0) {
      const seed = room.members[0]!
      const nextHost = room.members.reduce((candidate, current) =>
        (current.joinedAt < candidate.joinedAt ? current : candidate),
      seed)
      if (nextHost) {
        nextHost.isHost = true
      }
    }
    room.lastActive = Date.now()
    return removed ?? null
  }

  getMembersSnapshot(code: string): MemberSnapshot[] {
    const room = this.rooms.get(code)
    if (!room) return []
    return room.members.map((member) => ({
      memberId: member.memberId,
      clientId: member.clientId,
      displayName: member.displayName,
      avatar: member.avatar,
      isHost: member.isHost,
      joinedAt: member.joinedAt,
      status: member.status,
    }))
  }

  cleanupInactiveRooms(timeoutMs: number): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActive > timeoutMs) {
        this.rooms.delete(code);
      }
    }
  }
}

export const roomStore = new RoomStore();
