'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      // Don't expose internal error details
      setServerError('Invalid email or password. Please try again.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="pv-label"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="pv-control"
          placeholder="you@example.com"
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-400 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="pv-label"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="pv-control !pr-10"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('password')}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pv-muted)] hover:text-white transition"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-red-400 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="pv-btn pv-btn-primary w-full !py-2.5"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="text-center text-xs text-[var(--pv-muted)]">
        Personal use only. Contact the administrator to request access.
      </p>
    </form>
  )
}

