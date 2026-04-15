import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { SignUpForm } from './SignUpForm'

export default function SignUpPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="card p-8 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-xl mx-auto mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto mb-8" />
                <div className="space-y-4">
                  <div className="h-10 bg-gray-100 rounded-lg" />
                  <div className="h-10 bg-gray-100 rounded-lg" />
                  <div className="h-10 bg-gray-100 rounded-lg" />
                  <div className="h-12 bg-gray-200 rounded-xl" />
                </div>
              </div>
            }
          >
            <SignUpForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
