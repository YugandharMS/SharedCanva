'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoomSocket } from '@/lib/useRoomSocket'
import { useUserProfile } from '@/lib/profile'

export default function HomePage() {
	const router = useRouter()
	const { profile, ready: profileReady } = useUserProfile()
	const { createRoom, joinRoom } = useRoomSocket()
	const [roomCode, setRoomCode] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState<'create' | 'join' | null>(null)
	const [error, setError] = useState('')

	const getProfile = () => {
		if (!profileReady || !profile) {
			setError('Preparing your profile, please try again in a moment.')
			return null
		}
		return profile
	}

	const onCreate = async () => {
		const resolvedProfile = getProfile()
		if (!resolvedProfile) return
		try {
			setLoading('create')
			setError('')
			const res = await createRoom({ profile: resolvedProfile })
			router.push(`/room/${res.roomCode}`)
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to create room'
			setError(msg)
		} finally {
			setLoading(null)
		}
	}

	const onJoin = async () => {
		const resolvedProfile = getProfile()
		if (!resolvedProfile) return
		const trimmedCode = roomCode.trim()
		if (!trimmedCode) {
			setError('Please enter a room code.')
			return
		}
		try {
			setLoading('join')
			setError('')
			const res = await joinRoom({ code: trimmedCode, password: password || undefined, profile: resolvedProfile })
			router.push(`/room/${res.roomCode}`)
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed to join room'
			setError(msg)
		} finally {
			setLoading(null)
		}
	}

	return (
		<div className="app-container py-12">
			{/* Hero Section */}
			<section className="text-center mb-20 animate-fade-in">
				<div className="inline-block mb-6 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/5">
					<span className="text-green-500 text-sm font-semibold uppercase tracking-widest">Next-Gen Collaboration</span>
				</div>
				<h1 className="text-6xl md:text-7xl font-bold mb-6 neon-text leading-tight">
					Real-time<br />Shared Canvas
				</h1>
				<p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
					Experience seamless collaboration with instant synchronization. 
					Draw, design, and create together in real-time with your team.
				</p>
				<div className="flex flex-wrap gap-4 justify-center items-center mb-12">
					<div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/20 bg-green-500/5">
						<svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
						<span className="text-sm text-green-500">Instant Sync</span>
					</div>
					<div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/20 bg-green-500/5">
						<svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
						<span className="text-sm text-green-500">Collaborative Undo</span>
					</div>
					<div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/20 bg-green-500/5">
						<svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
						<span className="text-sm text-green-500">Multi-Device</span>
					</div>
				</div>
			</section>

			{/* Action Cards */}
			<div className="grid md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
				<div className="card space-y-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
							<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</div>
						<h2 className="text-2xl font-bold neon-text">Create Room</h2>
					</div>
					<p className="text-gray-400 leading-relaxed">
						Start a new collaboration space instantly. Share the room code with your team and begin creating together.
					</p>
					<button
						onClick={onCreate}
						disabled={loading === 'create' || !profileReady}
						className="btn w-full text-lg py-4"
					>
						{loading === 'create' ? (
							<span className="flex items-center gap-2">
								<svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Initializing...
							</span>
						) : (
							'Create New Room'
						)}
					</button>
				</div>

				<div className="card space-y-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
							<svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
							</svg>
						</div>
						<h2 className="text-2xl font-bold neon-text">Join Room</h2>
					</div>
					<div className="space-y-4">
						<div>
							<label className="label" htmlFor="room-code-input">
								Room Code
							</label>
							<input
								id="room-code-input"
								className="input uppercase tracking-wide font-mono text-lg"
								value={roomCode}
								onChange={(event) => setRoomCode(event.target.value)}
								placeholder="A1B2C3"
							/>
						</div>
						<div>
							<label className="label" htmlFor="room-password-input">
								Password <span className="text-gray-500 normal-case">(optional)</span>
							</label>
							<input
								id="room-password-input"
								type="password"
								className="input"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								placeholder="••••••"
							/>
						</div>
					</div>
					<button
						onClick={onJoin}
						disabled={!roomCode || loading === 'join' || !profileReady}
						className="btn w-full text-lg py-4"
					>
						{loading === 'join' ? (
							<span className="flex items-center gap-2">
								<svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Connecting...
							</span>
						) : (
							'Join Room'
						)}
					</button>
					{error && (
						<div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
							<p className="text-sm text-red-400">{error}</p>
						</div>
					)}
				</div>
			</div>

			{/* Features Section */}
			<section className="max-w-6xl mx-auto mb-20 animate-fade-in" style={{ animationDelay: '0.3s' }}>
				<h2 className="text-3xl font-bold text-center mb-12 neon-text">Powerful Features</h2>
				<div className="grid md:grid-cols-3 gap-6">
					<div className="card text-center space-y-4 hover:scale-105 transition-transform duration-300">
						<div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
							<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-green-500">Lightning Fast</h3>
						<p className="text-gray-400">Sub-millisecond synchronization keeps everyone in perfect sync</p>
					</div>
					<div className="card text-center space-y-4 hover:scale-105 transition-transform duration-300">
						<div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
							<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-green-500">Team Collaboration</h3>
						<p className="text-gray-400">Multiple users can draw and edit simultaneously without conflicts</p>
					</div>
					<div className="card text-center space-y-4 hover:scale-105 transition-transform duration-300">
						<div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
							<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
						<h3 className="text-xl font-bold text-green-500">Secure Rooms</h3>
						<p className="text-gray-400">Optional password protection keeps your work private and secure</p>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-green-500/20 pt-12 mt-20">
				<div className="max-w-6xl mx-auto">
					<div className="grid md:grid-cols-3 gap-8 mb-8">
						<div>
							<h3 className="text-lg font-bold neon-text mb-4">About</h3>
							<p className="text-gray-400 text-sm leading-relaxed">
								Shared Canvas is a next-generation real-time collaboration platform designed for modern teams. 
								Experience the future of visual collaboration today.
							</p>
						</div>
						<div>
							<h3 className="text-lg font-bold neon-text mb-4">Features</h3>
							<ul className="space-y-2 text-sm text-gray-400">
								<li className="flex items-center gap-2">
									<span className="text-green-500">▹</span> Real-time synchronization
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">▹</span> Collaborative undo/redo
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">▹</span> Pressure-sensitive drawing
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">▹</span> Multi-device support
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-lg font-bold neon-text mb-4">Demo Info</h3>
							<div className="space-y-3 text-sm">
								<div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
									<p className="text-green-500 font-semibold mb-1">Quick Start</p>
									<p className="text-gray-400">Create a room and share the code with your team to start collaborating instantly.</p>
								</div>
								<div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
									<p className="text-green-500 font-semibold mb-1">Technology</p>
									<p className="text-gray-400">Built with Next.js, Socket.IO, and WebSocket for real-time performance.</p>
								</div>
							</div>
						</div>
					</div>
					<div className="border-t border-green-500/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-sm text-gray-500">
							© 2025 Shared Canvas. Built for the future of collaboration.
						</p>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
								<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
								<span className="text-xs text-green-500 font-semibold">System Online</span>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
