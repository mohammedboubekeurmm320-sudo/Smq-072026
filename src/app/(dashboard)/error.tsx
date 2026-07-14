'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl font-bold text-red-500">!</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error.message || 'Erreur inattendue'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}