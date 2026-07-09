import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from '@/lib/auth-server'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiSuccess({ session: null })
    return apiSuccess({ session })
  } catch (e: any) {
    return apiError(e.message || 'Erreur serveur', 500)
  }
}
