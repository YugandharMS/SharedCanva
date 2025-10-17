import { useCallback, useEffect, useRef, useState } from 'react'

export interface UserProfile {
  clientId: string
  displayName: string
  avatar: string
}

const STORAGE_KEY = 'shared-canvas:profile'

const ADJECTIVES = [
  'Agile',
  'Bold',
  'Calm',
  'Daring',
  'Eager',
  'Fierce',
  'Gentle',
  'Happy',
  'Keen',
  'Lively',
  'Nimble',
  'Quick',
  'Rapid',
  'Serene',
  'Swift',
  'Vivid',
]

const NOUNS = [
  'Artist',
  'Brush',
  'Canvas',
  'Creator',
  'Designer',
  'Illustrator',
  'Painter',
  'Sketcher',
  'Visionary',
  'Maker',
  'Dreamer',
  'Builder',
  'Thinker',
  'Explorer',
  'Inventor',
  'Navigator',
]

const AVATARS = ['🎨', '🖌️', '🧠', '🧩', '✨', '🎯', '🛠️', '🪄', '🌈', '🎲']

const randomPick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)]

const generateClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}

const sanitizeDisplayName = (value: string): string => {
  const trimmed = value.trim().replace(/[\r\n]+/g, ' ').slice(0, 40)
  return trimmed.length > 1 ? trimmed : `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`
}

const sanitizeAvatar = (value: string): string => {
  if (!value) return randomPick(AVATARS)
  return value.slice(0, 4)
}

const buildProfile = (): UserProfile => ({
  clientId: generateClientId(),
  displayName: `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`,
  avatar: randomPick(AVATARS),
})

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const writeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>
        const merged: UserProfile = {
          clientId: typeof parsed.clientId === 'string' ? parsed.clientId : generateClientId(),
          displayName: parsed.displayName ? sanitizeDisplayName(parsed.displayName) : `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`,
          avatar: parsed.avatar ? sanitizeAvatar(parsed.avatar) : randomPick(AVATARS),
        }
        setProfile(merged)
      } else {
        const generated = buildProfile()
        setProfile(generated)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(generated))
      }
    } catch (err) {
      console.warn('Unable to load profile, generating fallback', err)
      const fallback = buildProfile()
      setProfile(fallback)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!profile) return
    if (writeTimer.current) {
      window.clearTimeout(writeTimer.current)
    }
    writeTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      } catch (err) {
        console.warn('Unable to persist profile', err)
      }
    }, 150)
    return () => {
      if (writeTimer.current) {
        window.clearTimeout(writeTimer.current)
      }
    }
  }, [profile])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile(prev => {
      const source = prev ?? buildProfile()
      return {
        clientId: patch.clientId ?? source.clientId,
        displayName: patch.displayName ? sanitizeDisplayName(patch.displayName) : source.displayName,
        avatar: patch.avatar ? sanitizeAvatar(patch.avatar) : source.avatar,
      }
    })
  }, [])

  return { profile, ready, updateProfile }
}
