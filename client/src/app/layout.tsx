import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Shared Canvas — Real-time Collaboration',
  description: 'Futuristic real-time collaborative canvas with instant sync and seamless teamwork',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-green-500/20 bg-black/80 backdrop-blur-lg">
          <div className="app-container py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center group-hover:border-green-500 transition-all duration-300">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold neon-text tracking-wide">SHARED CANVAS</h1>
                <p className="text-xs text-green-500/60 uppercase tracking-widest">Real-time Collaboration</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-500 font-semibold uppercase tracking-wide">Live</span>
              </div>
              <div className="text-xs text-green-500/40 uppercase tracking-widest font-mono">v2.0</div>
            </div>
          </div>
        </header>
        <main className="pt-20 min-h-screen relative">{children}</main>
      </body>
    </html>
  )
}