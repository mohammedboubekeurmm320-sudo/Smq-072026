'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, Plus, FileText, Copy, Archive, Eye, Check, X,
  ArrowUp, ArrowDown, Trash2, Save, Loader2, LayoutTemplate, Send,
} from 'lucide-react'
import { getStatusColor } from '@/lib/status-colors'
import type { FieldType, FormFieldDefinition } from '@/types/qms'

// ─── Field type palette ────────────────────────────────────────────────────
const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Texte court', icon: 'Type' },
  { type: 'number', label: 'Nombre', icon: '#' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'select', label: 'Liste déroulante', icon: '☰' },
  { type: 'checkbox', label: 'Case à cocher', icon: '☑' },
  { type: 'textarea', label: 'Zone de texte', icon: '¶' },
  { type: 'rating', label: 'Évaluation', icon: '★' },
  { type: 'file', label: 'Fichier', icon: '📎' },
  { type: 'table', label: 'Tableau', icon: '▦' },
  { type: 'repeater', label: 'Répéteur', icon: '⊞' },
]

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_TEMPLATES = [
  { id: 't1', name: 'Formulaire de libération de lot', description: 'Formulaire pour la libération de lots de production', fields_count: 8, status: 'Approved', version: '2.1', created_at: '2025-01-15T10:00:00Z' },
  { id: 't2', name: 'Rapport d\'audit interne', description: 'Rapport standard pour les audits internes qualité', fields_count: 14, status: 'Approved', version: '1.3', created_at: '2025-02-20T14:30:00Z' },
  { id: 't3', name: 'Fiche de non-conformité', description: 'Fiche de signalement et traitement des non-conformités', fields_count: 10, status: 'Under_Review', version: '3.0', created_at: '2025-03-10T09:00:00Z' },
  { id: 't4', name: 'Vérification fournisseur', description: 'Questionnaire d\'évaluation des fournisseurs', fields_count: 20, status: 'Draft', version: '0.5', created_at: '2025-04-01T16:00:00Z' },
]

const MOCK_INSTANCES = [
  { id: 'i1', template_name: 'Formulaire de libération de lot', submitter: 'Marie Dupont', status: 'Approved', submitted_at: '2025-06-01T10:00:00Z' },
  { id: 'i2', template_name: 'Rapport d\'audit interne', submitter: 'Jean Martin', status: 'Submitted', submitted_at: '2025-06-10T14:30:00Z' },
  { id: 'i3', template_name: 'Fiche de non-conformité', submitter: 'Sophie Bernard', status: 'Rejected', submitted_at: '2025-06-15T09:00:00Z' },
  { id: 'i4', template_name: 'Vérification fournisseur', submitter: 'Pierre Leroy', status: 'Draft', submitted_at: '2025-06-20T11:00:00Z' },
]

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
}

export default function FormView() {
  const router = useRouter()
  const [templates, setTemplates] = useState(MOCK_TEMPLATES)
  const [instances, setInstances] = useState(MOCK_INSTANCES)
  const [loading, setLoading] = useState(false)

  // Builder state
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [fields, setFields] = useState<FormFieldDefinition[]>([])
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // ─── Field builder helpers ───────────────────────────────────────────────
  const addField = (type: FieldType) => {
    const newField: FormFieldDefinition = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `field_${fields.length + 1}`,
      label: `Champ ${fields.length + 1}`,
      type,
      required: false,
      helpText: '',
    }
    setFields(prev => [...prev, newField])
    setSelectedFieldIdx(fields.length)
  }

  const updateField = (idx: number, patch: Partial<FormFieldDefinition>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx))
    if (selectedFieldIdx === idx) setSelectedFieldIdx(null)
    else if (selectedFieldIdx !== null && selectedFieldIdx > idx) setSelectedFieldIdx(prev => prev! - 1)
  }

  const moveField = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= fields.length) return
    const newFields = [...fields]
    const temp = newFields[idx]
    newFields[idx] = newFields[newIdx]
    newFields[newIdx] = temp
    setFields(newFields)
    if (selectedFieldIdx === idx) setSelectedFieldIdx(newIdx)
    else if (selectedFieldIdx === newIdx) setSelectedFieldIdx(idx)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { alert('Le nom du modèle est requis'); return }
    setSaving(true)
    try {
      await apiPost('/api/forms/templates', {
        name: templateName,
        description: templateDesc,
        fields,
        status: 'Draft',
      })
      setTemplateName('')
      setTemplateDesc('')
      setFields([])
      setSelectedFieldIdx(null)
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicateTemplate = (t: typeof templates[0]) => {
    setTemplates(prev => [...prev, { ...t, id: `t_${Date.now()}`, name: `${t.name} (copie)`, status: 'Draft', version: '0.1' }])
  }

  const handleArchiveTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, status: 'Obsolete' } : t))
  }

  const handleApproveInstance = (id: string) => {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'Approved' } : i))
  }

  const handleRejectInstance = (id: string) => {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'Rejected' } : i))
  }

  const selectedField = selectedFieldIdx !== null ? fields[selectedFieldIdx] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" /> Formulaires
          </h1>
          <p className="text-sm text-muted-foreground">Gestion des modèles et instances de formulaires</p>
        </div>
      </div>

      <Tabs defaultValue="modeles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modeles">Modèles</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="constructeur">Constructeur</TabsTrigger>
        </TabsList>

        {/* ─── Modèles tab ──────────────────────────────────────────────────── */}
        <TabsContent value="modeles" className="space-y-4">
          <div className="grid gap-3">
            {templates.map(t => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{t.name}</h3>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(t.status)}`}>{t.status}</Badge>
                        <Badge variant="secondary" className="text-xs">v{t.version}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">{t.fields_count} champ(s)</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Dupliquer" onClick={() => handleDuplicateTemplate(t)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Archiver"
                        onClick={() => handleArchiveTemplate(t.id)}
                        disabled={t.status === 'Obsolete'}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Instances tab ────────────────────────────────────────────────── */}
        <TabsContent value="instances" className="space-y-4">
          <div className="grid gap-3">
            {instances.map(inst => (
              <Card key={inst.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{inst.template_name}</h3>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(inst.status)}`}>{inst.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">Soumis par : {inst.submitter}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(inst.submitted_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {inst.status === 'Submitted' && (
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700"
                            title="Approuver"
                            onClick={() => handleApproveInstance(inst.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Rejeter"
                            onClick={() => handleRejectInstance(inst.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Constructeur tab ─────────────────────────────────────────────── */}
        <TabsContent value="constructeur" className="space-y-4">
          {/* Template header */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Nom du modèle</Label>
                  <Input
                    placeholder="Ex: Formulaire de contrôle qualité"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Input
                    placeholder="Description brève du formulaire"
                    value={templateDesc}
                    onChange={e => setTemplateDesc(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Field palette */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Palette de champs</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="grid gap-1">
                    {FIELD_TYPES.map(ft => (
                      <Button
                        key={ft.type}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs h-9"
                        onClick={() => addField(ft.type)}
                      >
                        <span className="mr-2 w-5 text-center">{ft.icon}</span>
                        {ft.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field list + config */}
            <div className="lg:col-span-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Champs ({fields.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {fields.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p>Aucun champ. Cliquez sur un type pour ajouter.</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-1">
                        {fields.map((field, idx) => (
                          <div
                            key={field.id}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors border ${
                              selectedFieldIdx === idx
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent hover:bg-muted'
                            }`}
                            onClick={() => setSelectedFieldIdx(idx)}
                          >
                            <span className="flex-shrink-0 w-5 text-center text-xs text-muted-foreground">{idx + 1}</span>
                            <span className="flex-1 truncate">{field.label}</span>
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">{field.type}</Badge>
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                className="h-3 w-3 rounded-sm hover:bg-muted flex items-center justify-center"
                                onClick={e => { e.stopPropagation(); moveField(idx, 'up') }}
                                disabled={idx === 0}
                              >
                                <ArrowUp className="h-2.5 w-2.5" />
                              </button>
                              <button
                                className="h-3 w-3 rounded-sm hover:bg-muted flex items-center justify-center"
                                onClick={e => { e.stopPropagation(); moveField(idx, 'down') }}
                                disabled={idx === fields.length - 1}
                              >
                                <ArrowDown className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <button
                              className="h-6 w-6 rounded-sm hover:bg-red-50 hover:text-red-600 flex items-center justify-center flex-shrink-0"
                              onClick={e => { e.stopPropagation(); removeField(idx) }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Field config panel */}
              {selectedField && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Configuration du champ</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Label className="text-xs">Libellé</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={selectedField.label}
                        onChange={e => updateField(selectedFieldIdx!, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nom technique</Label>
                      <Input
                        className="mt-1 h-8 text-sm font-mono"
                        value={selectedField.name}
                        onChange={e => updateField(selectedFieldIdx!, { name: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={v => updateField(selectedFieldIdx!, { type: v as FieldType })}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(ft => (
                              <SelectItem key={ft.type} value={ft.type}>{ft.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <Checkbox
                          id="field-required"
                          checked={selectedField.required}
                          onCheckedChange={v => updateField(selectedFieldIdx!, { required: !!v })}
                        />
                        <Label htmlFor="field-required" className="text-xs">Obligatoire</Label>
                      </div>
                    </div>
                    {selectedField.type === 'select' && (
                      <div>
                        <Label className="text-xs">Options (une par ligne)</Label>
                        <Textarea
                          className="mt-1 text-sm"
                          rows={4}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          value={selectedField.options?.join('\n') || ''}
                          onChange={e => updateField(selectedFieldIdx!, {
                            options: e.target.value.split('\n').filter(Boolean),
                          })}
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Texte d&apos;aide</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        placeholder="Indication affichée sous le champ"
                        value={selectedField.helpText || ''}
                        onChange={e => updateField(selectedFieldIdx!, { helpText: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview panel */}
            <div className="lg:col-span-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Aperçu</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {templateName && <h3 className="font-semibold text-sm mb-1">{templateName}</h3>}
                  {templateDesc && <p className="text-xs text-muted-foreground mb-4">{templateDesc}</p>}
                  <Separator className="mb-4" />
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aperçu du formulaire</p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="space-y-1">
                          <Label className="text-sm">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          {field.type === 'text' && (
                            <Input className="h-8 text-sm" placeholder={`Saisir ${field.label.toLowerCase()}`} disabled />
                          )}
                          {field.type === 'number' && (
                            <Input className="h-8 text-sm" type="number" placeholder="0" disabled />
                          )}
                          {field.type === 'date' && (
                            <Input className="h-8 text-sm" type="date" disabled />
                          )}
                          {field.type === 'select' && (
                            <Select disabled>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === 'checkbox' && (
                            <div className="flex items-center gap-2">
                              <Checkbox disabled />
                              <span className="text-sm text-muted-foreground">Option</span>
                            </div>
                          )}
                          {field.type === 'textarea' && (
                            <Textarea className="text-sm" rows={3} placeholder={`Saisir ${field.label.toLowerCase()}`} disabled />
                          )}
                          {field.type === 'rating' && (
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} className="text-lg text-amber-400 opacity-40">★</span>
                              ))}
                            </div>
                          )}
                          {field.type === 'file' && (
                            <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                              Glisser-déposer ou cliquer pour télécharger
                            </div>
                          )}
                          {field.type === 'table' && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="grid grid-cols-3 bg-muted text-xs">
                                <div className="p-2 border-r">Col 1</div>
                                <div className="p-2 border-r">Col 2</div>
                                <div className="p-2">Col 3</div>
                              </div>
                              <div className="grid grid-cols-3 text-xs">
                                <div className="p-2 border-r border-t">—</div>
                                <div className="p-2 border-r border-t">—</div>
                                <div className="p-2 border-t">—</div>
                              </div>
                            </div>
                          )}
                          {field.type === 'repeater' && (
                            <div className="border rounded-md p-3 space-y-2">
                              <p className="text-xs text-muted-foreground">Section répétable</p>
                              <div className="border-dashed border rounded p-2 text-xs text-center text-muted-foreground">+ Ajouter une entrée</div>
                            </div>
                          )}
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                {fields.length > 0 && (
                  <div className="px-4 pb-4">
                    <Button className="w-full" onClick={handleSaveTemplate} disabled={saving || !templateName.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Sauvegarder le modèle
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}