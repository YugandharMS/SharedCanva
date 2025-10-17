import type { Member } from '@/types'

interface MemberListProps {
  members: Member[]
  selfMemberId?: string | null
}

export default function MemberList({ members, selfMemberId }: MemberListProps) {
  if (!members?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">
          No collaborators yet. Share the room code to invite teammates.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => {
        const isYou = selfMemberId ? member.memberId === selfMemberId : false
        const statusLabel = member.status === 'online' ? 'Online' : 'Offline'
        const isOnline = member.status === 'online'

        return (
          <li
            key={member.memberId}
            className={`group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300 ${
              isYou 
                ? 'border-green-500/50 bg-gradient-to-r from-green-500/15 to-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                : isOnline
                ? 'border-green-500/20 bg-black/40 hover:border-green-500/40 hover:bg-green-500/5'
                : 'border-gray-800/50 bg-black/20'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl transition-transform duration-300 group-hover:scale-110 ${
                isYou 
                  ? 'bg-gradient-to-br from-green-500/30 to-green-500/10 border-2 border-green-500/50' 
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700'
              }`}>
                {member.avatar || '🙂'}
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-black shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                )}
              </div>
              <div className="text-sm min-w-0 flex-1">
                <div className={`font-semibold truncate ${isYou ? 'text-green-500' : 'text-gray-200'}`}>
                  {member.displayName}
                  {isYou && <span className="ml-1.5 text-green-500/70">(You)</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isOnline 
                        ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-pulse' 
                        : 'bg-gray-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={isOnline ? 'text-green-500/80' : 'text-gray-600'}>{statusLabel}</span>
                </div>
              </div>
            </div>
            {member.isHost && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30">
                <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wide text-amber-500">
                  Host
                </span>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}