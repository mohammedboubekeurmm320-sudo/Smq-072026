'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Layers, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  name: string
  description?: string
  fields?: Array<{ id: string; name: string; label: string; type: string }>
  version?: string
}

interface TemplateSelectorProps {
  templates: Template[]
  onSelect: (template: Template) => void
  value?: string
}

export function TemplateSelector({ templates, onSelect, value }: TemplateSelectorProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    )
  }, [templates, search])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un modèle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mb-2" />
          <p className="text-sm">Aucun modèle trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const isSelected = template.id === value
            return (
              <Card
                key={template.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => onSelect(template)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(template)}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-primary border-primary'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">
                      {template.name}
                    </CardTitle>
                    {template.version && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        v{template.version}
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>
                      {template.fields?.length ?? 0} champ{template.fields?.length !== 1 ? 's' : ''}
                    </span>
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