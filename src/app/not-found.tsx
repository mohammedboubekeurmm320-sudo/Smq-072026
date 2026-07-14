import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-emerald-600">404</div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Page introuvable
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}