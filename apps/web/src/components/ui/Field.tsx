import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  hint?: string
  optional?: boolean
  className?: string
  children: ReactNode
}

/** Visible label + optional hint wrapped around a form control. */
export function Field({ label, hint, optional, className = '', children }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="pv-label">
        {label}
        {optional && <span className="ml-1 font-normal normal-case tracking-normal text-[#5b6385]">(optional)</span>}
      </span>
      {children}
      {hint && <span className="pv-hint block">{hint}</span>}
    </label>
  )
}
