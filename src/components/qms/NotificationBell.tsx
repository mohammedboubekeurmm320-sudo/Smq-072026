'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Bell, Check, Clock, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  info: Info,
  warning: AlertTriangle,
  deadline: Clock,
  assignment: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-600 bg-blue-50',
  warning: 'text-amber-600 bg-amber-50',
  deadline: 'text-red-600 bg-red-50',
  assignment: 'text-violet-600 bg-violet-50',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await apiGet<any>('/api/qms/notifications?limit=15&sort=createdAt&order=desc')
      setNotifications(res?.data || res || [])
    } catch {
      // Notifications API may not exist yet, silent fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, [])

  const handleClick = (n: Notification) => {
    setOpen(false)
    if (n.entityType && n.entityId) {
      router.push(`/qms/${n.entityType}/${n.entityId}`)
    }
  }

  const fmtDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `Il y a ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Il y a ${hours}h`
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">{unreadCount} non lues</Badge>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] || Info
              const color = TYPE_COLORS[n.type] || 'text-gray-600 bg-gray-50'

              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0',
                    !n.read && 'bg-blue-50/30',
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <span className="text-xs text-muted-foreground mt-1 block">{fmtDate(n.createdAt)}</span>
                  </div>
                  {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                </div>
              )
            })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); router.push('/notifications') }}>
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}