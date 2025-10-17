export type MemberStatus = 'online' | 'offline'

export interface Member {
   memberId: string
   clientId: string
   displayName: string
   avatar: string
   isHost: boolean
   joinedAt: number
   status: MemberStatus
}

export interface RoomJoinedPayload {
   roomCode: string
   isHost: boolean
   members: Member[]
   self?: Member | null
}