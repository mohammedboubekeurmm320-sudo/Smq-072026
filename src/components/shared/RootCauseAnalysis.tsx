'use client'

import { ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface RootCauseAnalysisProps {
  value: string
  onChange: (value: string) => void
  method?: '5why' | 'ishikawa' | 'freeform'
  onMethodChange?: (method: string) => void
  disabled?: boolean
  className?: string
}

const ISHIKAWA_CATEGORIES = [
  { key: 'matiere', label: 'Matière', sub: 'Materials' },
  { key: 'methode', label: 'Méthode', sub: 'Methods' },
  { key: 'machine', label: 'Machine', sub: 'Machines' },
  { key: 'maindoeuvre', label: "Main-d'œuvre", sub: 'Manpower' },
  { key: 'mesure', label: 'Mesure', sub: 'Measurement' },
  { key: 'milieu', label: 'Milieu', sub: 'Environment' },
]

export function RootCauseAnalysis({
  value,
  onChange,
  method = 'freeform',
  onMethodChange,
  disabled = false,
  className = '',
}: RootCauseAnalysisProps) {
  // Parse 5-why values from stored JSON or fallback to individual lines
  const parse5Whys = (): string[] => {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length === 5) return parsed
    } catch { /* not JSON array */ }
    return value.split('\n').slice(0, 5).length >= 2
      ? value.split('\n').slice(0, 5)
      : ['', '', '', '', '']
  }

  const handle5WhyChange = (idx: number, val: string) => {
    const whys = parse5Whys()
    whys[idx] = val
    onChange(JSON.stringify(whys))
  }

  // Parse ishikawa from JSON { key: notes }
  const parseIshikawa = (): Record<string, string> => {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* not JSON object */ }
    return {}
  }

  const handleIshikawaChange = (key: string, notes: string) => {
    const current = parseIshikawa()
    onChange(JSON.stringify({ ...current, [key]: notes }))
  }

  return (
    <div className={className}>
      {/* Method toggle */}
      {onMethodChange && (
        <div className="flex gap-1 mb-3">
          {([
            { key: '5why', label: '5 Pourquoi' },
            { key: 'ishikawa', label: 'Ishikawa 6M' },
            { key: 'freeform', label: 'Libre' },
          ] as const).map(m => (
            <Button
              key={m.key}
              type="button"
              size="sm"
              variant={method === m.key ? 'default' : 'outline'}
              className="text-[11px] h-7"
              onClick={() => onMethodChange(m.key)}
              disabled={disabled}
            >
              {m.label}
            </Button>
          ))}
        </div>
      )}

      {/* 5-Why */}
      {method === '5why' && (
        <div className="space-y-1.5">
          {parse5Whys().map((w, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="flex justify-center my-0.5">
                  <ArrowDown className="w-3 h-3 text-orange-500" />
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 mt-1.5 shrink-0 w-8">
                  P{i + 1}
                </span>
                <Input
                  className="text-xs h-8"
                  placeholder={i === 0 ? 'Pourquoi cela s\'est-il produit ?' : `Pourquoi ? (${i + 1}/5)`}
                  value={w}
                  onChange={e => handle5WhyChange(i, e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-1">
            La réponse au 5ème Pourquoi identifie la cause racine.
          </p>
        </div>
      )}

      {/* Ishikawa */}
      {method === 'ishikawa' && (
        <div className="grid grid-cols-2 gap-2">
          {ISHIKAWA_CATEGORIES.map(cat => {
            const notes = parseIshikawa()[cat.key] || ''
            return (
              <div key={cat.key} className="border rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <Label className="text-xs font-medium">{cat.label}</Label>
                  <span className="text-[9px] text-muted-foreground">{cat.sub}</span>
                </div>
                <Textarea
                  className="text-[11px] min-h-[48px]"
                  placeholder={`Facteurs ${cat.label.toLowerCase()}...`}
                  value={notes}
                  onChange={e => handleIshikawaChange(cat.key, e.target.value)}
                  disabled={disabled}
                  rows={2}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Freeform */}
      {method === 'freeform' && (
        <Textarea
          className="text-xs min-h-[120px]"
          placeholder="Décrire la cause racine identifiée..."
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          rows={5}
        />
      )}
    </div>
  )
}