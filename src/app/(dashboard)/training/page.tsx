'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useModule } from '@/hooks/useModule'
import { api, apiGet } from '@/lib/api-client'
import { getStatusColor } from '@/lib/status-colors'
import { getFlowSteps, isESigRequired } from '@/lib/status-flows'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Plus, ArrowLeft, Search, ChevronLeft, ChevronRight,
  GraduationCap, Clock, AlertTriangle, CheckCircle2,
  Upload, Users, Loader2,
} from 'lucide-react'
import type { TrainingType, TrainingStatus, DeliveryMethod, TrainingCategory, getEffectiveTrainingStatus } from '@/types/qms'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRAINING_TYPE_LABELS: Record<string, string> = {
  Onboarding: 'Intégration',
  SOP: 'SOP',
  Regulatory: 'Réglementaire',
  Skill: 'Compétence',
  Certification: 'Certification',
}

const DELIVERY_LABELS: Record<string, string> = {
  Classroom: 'Présentiel',
  Online: 'En ligne',
  'On-the-Job Training': 'Sur le poste de travail',
  Webinar: 'Webinaire',
  Blended: 'Mixte',
}

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

function effectiveStatus(status: TrainingStatus, dueDate?: string | null): TrainingStatus {
  if (status === 'Completed') return 'Completed'
  if (dueDate && new Date(dueDate) < new Date()) return 'Overdue'
  return status
}

// ─── Competency Matrix Component ────────────────────────────────────────────

function CompetencyMatrix({ trainings }: { trainings: any[] }) {
  if (trainings.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Matrice de compétences (aperçu)</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">Formation</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Inscrits</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Complétés</th>
                <th className="text-center p-2 font-medium text-muted-foreground">En retard</th>
                <th className="text-left p-2 font-medium text-muted-foreground w-32">Progression</th>
              </tr>
            </thead>
            <tbody>
              {trainings.slice(0, 8).map((t: any) => {
                const total = t.enrolled_count || 0
                const completed = t.completed_count || 0
                const overdue = t.overdue_count || 0
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <tr key={t.id} className="border-t">
                    <td className="p-2 font-medium truncate max-w-[200px]">{t.title || '—'}</td>
                    <td className="p-2 text-center">{total}</td>
                    <td className="p-2 text-center text-green-700">{completed}</td>
                    <td className="p-2 text-center text-red-700">{overdue}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TrainingView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [methodFilter, setMethodFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const { items, loading, refetch } = useModule('training')

  // Detail
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)

  // Workflow
  const [sigModal, setSigModal] = useState<{ open: boolean; targetStatus: string }>({ open: false, targetStatus: '' })
  const [transitioning, setTransitioning] = useState(false)

  // ── Filtered items ──
  const filtered = items.filter((t: any) => {
    if (typeFilter !== 'ALL' && t.training_type !== typeFilter) return false
    if (methodFilter !== 'ALL' && t.delivery_method !== methodFilter) return false
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.title || '').toLowerCase().includes(q) || (t.training_number || '').toLowerCase().includes(q)
    }
    return true
  })

  const pageSize = 15
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const [page, setPage] = useState(1)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ── Load detail ──
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const m = api.module('training')
      const item = await m.getById(id)
      setSelected(item)
    } catch { setSelected(null) }
    finally { setDetailLoading(false) }
  }, [])

  // ── Transition ──
  const handleTransition = async (targetStatus: string, password?: string, hash?: string) => {
    if (!selected) return
    setTransitioning(true)
    setSigModal({ open: false, targetStatus: '' })
    try {
      const m = api.module('training')
      await m.transition(selected.id, targetStatus, password, hash)
      await loadDetail(selected.id)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setTransitioning(false) }
  }

  const goBack = () => { setSelected(null); setShowMatrix(false) }

  // ── Stats ──
  const overdueCount = items.filter((t: any) => effectiveStatus(t.status, t.due_date) === 'Overdue').length
  const completedCount = items.filter((t: any) => t.status === 'Completed').length
  const completionRate = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selected) {
    const flowSteps = getFlowSteps('training', selected.status)
    const effStatus = effectiveStatus(selected.status, selected.due_date)
    const isOverdue = effStatus === 'Overdue'

    const getNext = () => {
      if (selected.status === 'Completed' || isOverdue) return []
      const idx = flowSteps.findIndex(s => s.isCurrent)
      if (idx >= 0 && idx < flowSteps.length - 1) return [flowSteps[idx + 1]]
      return []
    }
    const nextStatuses = getNext()

    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selected.training_number || selected.id}</Badge>
              <Badge className={getStatusColor(effStatus)}>{isOverdue ? 'En retard' : selected.status}</Badge>
              <Badge variant="outline">{TRAINING_TYPE_LABELS[selected.training_type] || selected.training_type}</Badge>
              {isOverdue && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />En retard</Badge>}
            </div>
            <h1 className="text-xl font-bold">{selected.title || '—'}</h1>
            {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
          </div>
          <div className="flex gap-2">
            {nextStatuses.map(ns => {
              const needsSig = isESigRequired('training', ns)
              return (
                <Button key={ns} size="sm" disabled={transitioning} onClick={() => {
                  if (needsSig) setSigModal({ open: true, targetStatus: ns })
                  else handleTransition(ns)
                }}>
                  {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {ns === 'Completed' ? 'Marquer comme terminé' : ns}
                </Button>
              )
            })}
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="effectiveness">Évaluation d&apos;efficacité</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{TRAINING_TYPE_LABELS[selected.training_type] || selected.training_type}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode de dispensation</span><span className="font-medium">{DELIVERY_LABELS[selected.delivery_method] || selected.delivery_method}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><span className="font-medium">{selected.category || '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Formateur</span><span className="font-medium">{selected.instructor || selected.trainer || 'Non assigné'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Date limite</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>{selected.due_date ? fmtDate(selected.due_date) : '—'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Durée</span><span className="font-medium">{selected.duration || '—'}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Certificat</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Zone de téléchargement du certificat</p>
                      <Button variant="outline" size="sm" className="mt-3" disabled>Importer le certificat</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="effectiveness" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Évaluation de l&apos;efficacité de la formation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted">
                    <Label className="text-xs text-muted-foreground">Satisfaction</Label>
                    <div className="text-2xl font-bold mt-1">{selected.evaluation_score ?? '—'}/5</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <Label className="text-xs text-muted-foreground">Évaluation des connaissances</Label>
                    <div className="text-2xl font-bold mt-1">{selected.knowledge_score ?? '—'}/100</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <Label className="text-xs text-muted-foreground">Efficacité</Label>
                    <div className="text-2xl font-bold mt-1">{selected.effectiveness_result || '—'}</div>
                  </div>
                </div>
                {selected.evaluation_comments && (
                  <div>
                    <Label>Commentaires d&apos;évaluation</Label>
                    <p className="text-sm mt-1 text-muted-foreground">{selected.evaluation_comments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ElectronicSignatureModal
          open={sigModal.open}
          title="Compléter la formation"
          description="Confirmez la complétion de cette formation avec votre signature électronique."
          recordId={selected.id}
          recordType="training"
          purpose="approval"
          onConfirm={(pwd, hash) => handleTransition(sigModal.targetStatus, pwd, hash)}
          onCancel={() => setSigModal({ open: false, targetStatus: '' })}
        />
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold">Formations</h1>
          <p className="text-sm text-muted-foreground">Suivi et gestion des formations · {items.length} enregistrement(s)</p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowMatrix(m => !m)}>
              <Users className="h-4 w-4 mr-1" /> {showMatrix ? 'Masquer la matrice' : 'Matrice de compétences'}
            </Button>
          )}
          <Button onClick={() => router.push('/qms/training/new')}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle formation
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total formations</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Complétées</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-muted-foreground">En retard</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{completionRate}%</p>
          <p className="text-xs text-muted-foreground">Taux de complétion</p>
        </CardContent></Card>
      </div>

      {/* Competency Matrix */}
      {showMatrix && <CompetencyMatrix trainings={items} />}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par titre ou numéro..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                {Object.entries(TRAINING_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={v => { setMethodFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                {Object.entries(DELIVERY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                <SelectItem value="GMP">GMP</SelectItem>
                <SelectItem value="GLP">GLP</SelectItem>
                <SelectItem value="GCP">GCP</SelectItem>
                <SelectItem value="Safety">Sécurité</SelectItem>
                <SelectItem value="Quality">Qualité</SelectItem>
                <SelectItem value="Other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucune formation trouvée</p>
            <Button variant="outline" onClick={() => router.push('/qms/training/new')}>
              <Plus className="h-4 w-4 mr-2" /> Créer la première
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {paged.map((t: any) => {
              const eff = effectiveStatus(t.status, t.due_date)
              const isOver = eff === 'Overdue'
              return (
                <Card key={t.id} className={`hover:shadow-md transition-shadow cursor-pointer ${isOver ? 'border-red-300 border' : ''}`} onClick={() => loadDetail(t.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${isOver ? 'bg-red-100' : 'bg-muted'}`}>
                        <GraduationCap className={`h-4 w-4 ${isOver ? 'text-red-600' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {t.training_number && <Badge variant="outline" className="font-mono text-xs">{t.training_number}</Badge>}
                          <Badge className={getStatusColor(eff)}>{isOver ? 'En retard' : t.status}</Badge>
                          <Badge variant="outline" className="text-xs">{TRAINING_TYPE_LABELS[t.training_type] || t.training_type}</Badge>
                          <Badge variant="outline" className="text-xs">{DELIVERY_LABELS[t.delivery_method] || t.delivery_method}</Badge>
                          {isOver && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />En retard</Badge>}
                        </div>
                        <h3 className="font-medium truncate">{t.title || '—'}</h3>
                        {t.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.due_date ? fmtDate(t.due_date) : '—'}</span>
                          <span>{t.category || '—'}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}