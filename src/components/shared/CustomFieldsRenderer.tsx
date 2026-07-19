'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Star, CalendarIcon, Upload, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface FieldDef {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'rating' | 'file' | 'table' | 'repeater'
  required?: boolean
  options?: string[]
  helpText?: string
}

interface CustomFieldsRendererProps {
  fields: FieldDef[]
  values: Record<string, unknown>
  readonly?: boolean
  onChange?: (name: string, value: unknown) => void
}

export function CustomFieldsRenderer({
  fields,
  values,
  readonly = false,
  onChange,
}: CustomFieldsRendererProps) {
  const handleChange = (name: string, value: unknown) => {
    onChange?.(name, value)
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const val = values[field.name]
        const requiredMark = field.required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        ) : null

        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {requiredMark}
            </Label>

            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}

            {/* Text */}
            {field.type === 'text' && (
              <Input
                id={field.name}
                value={(val as string) ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                readOnly={readonly}
                placeholder={readonly ? '—' : `Saisir ${field.label.toLowerCase()}`}
                className={cn(field.required && !val && 'border-amber-400')}
                aria-required={field.required}
              />
            )}

            {/* Number */}
            {field.type === 'number' && (
              <Input
                id={field.name}
                type="number"
                value={(val as number | string) ?? ''}
                onChange={(e) =>
                  handleChange(field.name, e.target.value === '' ? '' : Number(e.target.value))
                }
                readOnly={readonly}
                placeholder="0"
                aria-required={field.required}
              />
            )}

            {/* Date */}
            {field.type === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={field.name}
                    variant="outline"
                    disabled={readonly}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !val && 'text-muted-foreground'
                    )}
                    aria-required={field.required}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {val ? format(new Date(val as string), 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                {!readonly && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={val ? new Date(val as string) : undefined}
                      onSelect={(d) => d && handleChange(field.name, d.toISOString())}
                    />
                  </PopoverContent>
                )}
              </Popover>
            )}

            {/* Select */}
            {field.type === 'select' && field.options && (
              <Select
                value={(val as string) ?? ''}
                onValueChange={(v) => handleChange(field.name, v)}
                disabled={readonly}
              >
                <SelectTrigger className="w-full" aria-required={field.required}>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Checkbox */}
            {field.type === 'checkbox' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={!!val}
                  onCheckedChange={(checked) => handleChange(field.name, !!checked)}
                  disabled={readonly}
                  aria-required={field.required}
                />
                <Label htmlFor={field.name} className="font-normal text-sm cursor-pointer">
                  {val ? 'Oui' : 'Non'}
                </Label>
              </div>
            )}

            {/* Textarea */}
            {field.type === 'textarea' && (
              <Textarea
                id={field.name}
                value={(val as string) ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                readOnly={readonly}
                placeholder={readonly ? '—' : `Saisir ${field.label.toLowerCase()}`}
                rows={3}
                aria-required={field.required}
              />
            )}

            {/* Rating */}
            {field.type === 'rating' && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => handleChange(field.name, star)}
                    className="p-0.5 hover:scale-110 transition-transform"
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'h-6 w-6',
                        (val as number) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  </button>
                ))}
                {val && <span className="ml-2 text-sm text-muted-foreground">{val as number}/5</span>}
              </div>
            )}

            {/* File */}
            {field.type === 'file' && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={readonly} asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {val ? 'Changer le fichier' : 'Choisir un fichier'}
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleChange(field.name, file.name)
                      }}
                      disabled={readonly}
                    />
                  </label>
                </Button>
                {val && <span className="text-sm text-muted-foreground">{val as string}</span>}
              </div>
            )}

            {/* Table (simple key-value) */}
            {field.type === 'table' && (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Clé</th>
                      <th className="px-3 py-2 text-left font-medium">Valeur</th>
                      {!readonly && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(val) ? val : []).map((row: Record<string, string>, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5">{row.key ?? ''}</td>
                        <td className="px-3 py-1.5">{row.value ?? ''}</td>
                        {!readonly && (
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const rows = [...(Array.isArray(val) ? val : [])]
                                rows.splice(i, 1)
                                handleChange(field.name, rows)
                              }}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Supprimer la ligne"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-t-none"
                    onClick={() => {
                      const rows = [...(Array.isArray(val) ? val : []), { key: '', value: '' }]
                      handleChange(field.name, rows)
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter une ligne
                  </Button>
                )}
              </div>
            )}

            {/* Repeater */}
            {field.type === 'repeater' && (
              <div className="space-y-2">
                {(Array.isArray(val) ? val : []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const items = [...(Array.isArray(val) ? val : [])]
                        items[i] = e.target.value
                        handleChange(field.name, items)
                      }}
                      readOnly={readonly}
                      placeholder={`Élément ${i + 1}`}
                    />
                    {!readonly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const items = [...(Array.isArray(val) ? val : [])]
                          items.splice(i, 1)
                          handleChange(field.name, items)
                        }}
                        aria-label="Supprimer l'élément"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!readonly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const items = [...(Array.isArray(val) ? val : []), '']
                      handleChange(field.name, items)
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter un élément
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}