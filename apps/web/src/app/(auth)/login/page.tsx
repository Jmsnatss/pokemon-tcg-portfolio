import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white text-2xl font-bold shadow-lg">
            PV
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            PokéVault
          </h1>
          <p className="text-sm text-zinc-400">
            Sign in to your collection
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
