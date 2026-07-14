'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Info } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'
import { getEntityFields } from '@/lib/entity-fields'

export default function EntityCreatePage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const entityConfig = getEntityConfig(entity)
  const { create, isCreating } = useQmsEntity(entity)
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!entityConfig) return <div className="p-6">Entité non reconnue</div>

  const fields = getEntityFields(entity)

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !form[f.name]?.trim()) {
        errs[f.name] = `${f.label} est requis`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const result = await create(form as any)
      if (result?.id) router.push(`/qms/${entity}/${result.id}`)
      else router.push(`/qms/${entity}`)
    } catch (err: any) {
      setErrors({ _form: err.message || 'Erreur lors de la création' })
    }
  }

  const setField = (key: string, value: string) => {
    setForm({ ...form, [key]: value })
    // Clear field error on change
    if (errors[key]) {
      const { [key]: _, ...rest } = errors
      setErrors(rest)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
        </button>
        <h1 className="text-2xl font-bold mt-1">Nouveau {entityConfig.label}</h1>
        <p className="text-sm text-muted-foreground">{entityConfig.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          {errors._form && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {errors._form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(field => (
                <div
                  key={field.name}
                  className={field.colSpan === 2 ? 'md:col-span-2' : ''}
                >
                  <Label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {field.type === 'textarea' ? (
                    <Textarea
                      value={form[field.name] || ''}
                      onChange={e => setField(field.name, e.target.value)}
                      rows={3}
                      className="mt-1 text-sm"
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <Select value={form[field.name] || ''} onValueChange={v => setField(field.name, v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="-- Sélectionner --" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'number' ? (
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={form[field.name] || ''}
                      onChange={e => setField(field.name, e.target.value)}
                      className="mt-1 text-sm"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={form[field.name] || ''}
                      onChange={e => setField(field.name, e.target.value)}
                      className="mt-1 text-sm"
                      placeholder={field.placeholder}
                    />
                  )}

                  {field.helpText && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> {field.helpText}
                    </p>
                  )}
                  {errors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.push(`/qms/${entity}`)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer {entityConfig.label}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}