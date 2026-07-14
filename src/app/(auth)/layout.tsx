import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion — QMS ISO 13485 Pro',
  description: 'Authentification au système de management de la qualité',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {children}
    </div>
  )
}