import type { Metadata } from 'next'
import { Pokeball } from '@/components/ui/Pokeball'
import { LoginForm } from '@/features/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <div className="pv-app min-h-screen flex items-center justify-center px-4">
      <div className="pv-panel pv-rise w-full max-w-sm space-y-8 p-8">
        {/* Logo / branding */}
        <div className="text-center space-y-2">
          <Pokeball className="pv-pop mx-auto h-16 w-16 drop-shadow-[0_8px_16px_rgba(239,68,68,0.45)]" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            PokéVault
          </h1>
          <p className="text-sm text-[var(--pv-muted)]">
            Sign in to continue your journey
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}

