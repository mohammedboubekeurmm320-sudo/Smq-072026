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
import { Star, CalendarIcon, Upload, Plus, Trash2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { FormFieldDefinition, FieldType } from '@/types/qms'

interface DynamicFormFieldsProps {
  fields: FormFieldDefinition[]
  values: Record<string, unknown>
  errors?: Record<string, string>
  onChange: (name: string, value: unknown) => void
  disabled?: boolean
}

const SUPPORTED_TYPES: FieldType[] = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'rating', 'file', 'table', 'repeater', 'signature']

export function DynamicFormFields({
  fields,
  values,
  errors = {},
  onChange,
  disabled = false,
}: DynamicFormFieldsProps) {
  return (
    <div className="space-y-5">
      {fields
        .filter((f) => SUPPORTED_TYPES.includes(f.type))
        .map((field) => {
          const val = values[field.name]
          const error = errors[field.name]
          const hasError = !!error
          const requiredMark = field.required ? (
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          ) : null

          const fieldId = `field-${field.name}`
          const errorId = `field-${field.name}-error`

          return (
            <div key={field.id} className="space-y-1.5">
              <Label
                htmlFor={fieldId}
                className={cn('text-sm font-medium', hasError && 'text-destructive')}
              >
                {field.label}
                {requiredMark}
              </Label>

              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}

              {/* Text */}
              {field.type === 'text' && (
                <Input
                  id={fieldId}
                  value={(val as string) ?? ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  disabled={disabled}
                  placeholder={disabled ? '—' : `Saisir ${field.label.toLowerCase()}`}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  className={cn(hasError && 'border-destructive')}
                />
              )}

              {/* Number */}
              {field.type === 'number' && (
                <Input
                  id={fieldId}
                  type="number"
                  value={(val as number | string) ?? ''}
                  onChange={(e) =>
                    onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={disabled}
                  placeholder="0"
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  className={cn(hasError && 'border-destructive')}
                />
              )}

              {/* Date */}
              {field.type === 'date' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id={fieldId}
                      variant="outline"
                      disabled={disabled}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !val && 'text-muted-foreground',
                        hasError && 'border-destructive'
                      )}
                      aria-invalid={hasError || undefined}
                      aria-describedby={hasError ? errorId : undefined}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {val
                        ? format(new Date(val as string), 'dd/MM/yyyy', { locale: fr })
                        : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  {!disabled && (
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={val ? new Date(val as string) : undefined}
                        onSelect={(d) => d && onChange(field.name, d.toISOString())}
                      />
                    </PopoverContent>
                  )}
                </Popover>
              )}

              {/* Select */}
              {field.type === 'select' && field.options && (
                <Select
                  value={(val as string) ?? ''}
                  onValueChange={(v) => onChange(field.name, v)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={hasError || undefined}
                    aria-describedby={hasError ? errorId : undefined}
                  >
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
                    id={fieldId}
                    checked={!!val}
                    onCheckedChange={(checked) => onChange(field.name, !!checked)}
                    disabled={disabled}
                    aria-invalid={hasError || undefined}
                    aria-describedby={hasError ? errorId : undefined}
                  />
                  <Label htmlFor={fieldId} className="font-normal text-sm cursor-pointer">
                    {val ? 'Oui' : 'Non'}
                  </Label>
                </div>
              )}

              {/* Textarea */}
              {field.type === 'textarea' && (
                <Textarea
                  id={fieldId}
                  value={(val as string) ?? ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  disabled={disabled}
                  placeholder={disabled ? '—' : `Saisir ${field.label.toLowerCase()}`}
                  rows={3}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  className={cn(hasError && 'border-destructive')}
                />
              )}

              {/* Rating */}
              {field.type === 'rating' && (
                <div className="flex items-center gap-1" role="radiogroup" aria-label={field.label}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(field.name, star)}
                      className="p-0.5 hover:scale-110 transition-transform"
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                      role="radio"
                      aria-checked={(val as number) === star}
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
                  <Button type="button" variant="outline" size="sm" disabled={disabled} asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {val ? 'Changer le fichier' : 'Choisir un fichier'}
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onChange(field.name, file.name)
                        }}
                        disabled={disabled}
                        aria-invalid={hasError || undefined}
                        aria-describedby={hasError ? errorId : undefined}
                      />
                    </label>
                  </Button>
                  {val && <span className="text-sm text-muted-foreground">{val as string}</span>}
                </div>
              )}

              {/* Signature (placeholder) */}
              {field.type === 'signature' && (
                <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                  La signature électronique sera demandée lors de la soumission.
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
                        {!disabled && <th className="w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(val) ? val : []).map((row: Record<string, string>, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5">{row.key ?? ''}</td>
                          <td className="px-3 py-1.5">{row.value ?? ''}</td>
                          {!disabled && (
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const rows = [...(Array.isArray(val) ? val : [])]
                                  rows.splice(i, 1)
                                  onChange(field.name, rows)
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
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full rounded-t-none"
                      onClick={() => {
                        const rows = [...(Array.isArray(val) ? val : []), { key: '', value: '' }]
                        onChange(field.name, rows)
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
                          onChange(field.name, items)
                        }}
                        disabled={disabled}
                        placeholder={`Élément ${i + 1}`}
                      />
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const items = [...(Array.isArray(val) ? val : [])]
                            items.splice(i, 1)
                            onChange(field.name, items)
                          }}
                          aria-label="Supprimer l'élément"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!disabled && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = [...(Array.isArray(val) ? val : []), '']
                        onChange(field.name, items)
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Ajouter un élément
                    </Button>
                  )}
                </div>
              )}

              {/* Validation error */}
              {hasError && (
                <p id={errorId} className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}
            </div>
          )
        })}
    </div>
  )
}