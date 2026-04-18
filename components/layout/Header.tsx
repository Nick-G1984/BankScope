'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

export function Header() {
  const { user, profile, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 20 20" width="18" height="18">
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 13.197l-4.419 3.617A1 1 0 014 16V4z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">
              BankScope <span className="text-brand-700">Intelligence</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/roadmap"
              className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Roadmap
            </Link>
            {user && (
              <Link
                href="/workspace"
                className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                My Workspace
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {profile && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                    <span className="text-brand-600 font-bold">{profile.credit_balance}</span> credit{profile.credit_balance !== 1 ? 's' : ''}
                  </span>
                )}
                <Link href="/workspace" className="btn-primary text-sm hidden sm:inline-flex">
                  My Workspace
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/sign-in" className="btn-secondary text-sm hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/auth/sign-up" className="btn-primary text-sm">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
