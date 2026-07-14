'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Info, AlertTriangle, Clock, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  entityType?: string
  entityId?: string
}

const TYPE_ICONS: Record<string, any> = {
  info: Info, warning: AlertTriangle, deadline: Clock, assignment: Bell,
}
const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  deadline: 'text-red-600 bg-red-50 border-red-200',
  assignment: 'text-violet-600 bg-violet-50 border-violet-200',
}
const TYPE_LABELS: Record<string, string> = {
  info: 'Information',
  warning: 'Attention',
  deadline: 'Échéance',
  assignment: 'Attribution',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await apiGet<any>('/api/qms/notifications?limit=50&sort=createdAt&order=desc')
      setNotifications(res?.data || res || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchNotifications() }, [])

  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
  const unreadCount = notifications.filter(n => !n.read).length

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const handleClick = (n: Notification) => {
    if (n.entityType && n.entityId) {
      router.push(`/qms/${n.entityType}/${n.entityId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Aucune notification non lue'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Non lues {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Aucune notification</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'Toutes vos notifications ont été lues' : 'Vous n\'avez pas encore de notifications'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => {
            const Icon = TYPE_ICONS[n.type] || Info
            const color = TYPE_COLORS[n.type] || 'text-gray-600 bg-gray-50 border-gray-200'

            return (
              <Card
                key={n.id}
                className={cn(
                  'hover:shadow-md transition-all cursor-pointer',
                  !n.read && 'border-l-4 border-l-blue-500 bg-blue-50/20',
                )}
                onClick={() => handleClick(n)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 border', color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</h3>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      <Badge variant="outline" className="text-xs ml-auto">{TYPE_LABELS[n.type] || n.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{fmtDate(n.createdAt)}</span>
                      {n.entityType && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Voir le dossier
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}