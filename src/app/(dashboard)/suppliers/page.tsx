'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useModule } from '@/hooks/useModule'
import { api } from '@/lib/api-client'
import { getStatusColor } from '@/lib/status-colors'
import { getFlowSteps, canTransition } from '@/lib/status-flows'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Plus, ArrowLeft, Search, ChevronLeft, ChevronRight,
  Truck, Star, ShieldCheck, ShieldAlert, ShieldX,
  FileText, AlertTriangle, CheckCircle2, Loader2, Building2, Globe,
} from 'lucide-react'
import type { SupplierStatus, SupplierCategory, QualificationMethod } from '@/types/qms'

// ─── Helpers ────────────────────────────────────────────────────────────────

const SUPPLIER_STATUS_ICONS: Record<string, React.ReactNode> = {
  Qualified: <ShieldCheck className="h-4 w-4 text-green-600" />,
  Conditional: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  Disqualified: <ShieldX className="h-4 w-4 text-red-600" />,
  'Under Evaluation': <ShieldAlert className="h-4 w-4 text-slate-500" />,
}

const QUAL_METHOD_LABELS: Record<QualificationMethod, string> = {
  'On-Site Audit': 'Audit sur site',
  Questionnaire: 'Questionnaire',
  'Certificate Review': 'Revue des certificats',
  'Third-Party Assessment': 'Évaluation par un tiers',
  'Historical Performance': 'Performance historique',
}

const CATEGORY_LABELS: Record<string, string> = {
  'Raw Material': 'Matière première',
  Packaging: 'Emballage',
  Equipment: 'Équipement',
  Service: 'Service',
  'Contract Manufacturer': 'Fabricant sous-traitant',
  Laboratory: 'Laboratoire',
  Other: 'Autre',
}

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

// ─── Component ──────────────────────────────────────────────────────────────

export default function SupplierView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const { items, loading, refetch } = useModule('suppliers')

  // Detail
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Workflow
  const [sigModal, setSigModal] = useState<{ open: boolean; action: 'qualify' | 'disqualify' }>({ open: false, action: 'qualify' })
  const [transitioning, setTransitioning] = useState(false)

  // ── Filtered ──
  const filtered = items.filter((s: any) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (s.name || '').toLowerCase().includes(q) || (s.supplier_number || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q)
    }
    return true
  })

  const pageSize = 15
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ── Load detail ──
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const m = api.module('suppliers')
      const item = await m.getById(id)
      setSelected(item)
    } catch { setSelected(null) }
    finally { setDetailLoading(false) }
  }, [])

  // ── Qualify / Disqualify ──
  const handleQualificationAction = async (password: string, hash: string) => {
    if (!selected) return
    setTransitioning(true)
    setSigModal({ open: false, action: 'qualify' })
    try {
      const targetStatus = sigModal.action === 'qualify' ? 'Qualified' : 'Disqualified'
      const m = api.module('suppliers')
      await m.transition(selected.id, targetStatus, password, hash)
      await loadDetail(selected.id)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setTransitioning(false) }
  }

  const goBack = () => setSelected(null)

  // ── Stats ──
  const qualifiedCount = items.filter((s: any) => s.status === 'Qualified').length
  const conditionalCount = items.filter((s: any) => s.status === 'Conditional').length
  const disqualifiedCount = items.filter((s: any) => s.status === 'Disqualified').length
  const evalCount = items.filter((s: any) => s.status === 'Under Evaluation').length

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selected) {
    const flowSteps = getFlowSteps('suppliers', selected.status)
    const canQualify = selected.status === 'Under Evaluation' || selected.status === 'Conditional'
    const canDisqualify = selected.status !== 'Disqualified' && selected.status !== 'Qualified'

    const documents: any[] = Array.isArray(selected.documents) ? selected.documents : []

    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selected.supplier_number || selected.id}</Badge>
              <Badge className={getStatusColor(selected.status)}>{selected.status}</Badge>
              <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[selected.category] || selected.category}</Badge>
            </div>
            <h1 className="text-xl font-bold">{selected.name || '—'}</h1>
          </div>
          <div className="flex gap-2">
            {canQualify && (
              <Button size="sm" disabled={transitioning} onClick={() => setSigModal({ open: true, action: 'qualify' })}>
                {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <ShieldCheck className="h-4 w-4 mr-1" /> Qualifier
              </Button>
            )}
            {canDisqualify && (
              <Button size="sm" variant="destructive" disabled={transitioning} onClick={() => setSigModal({ open: true, action: 'disqualify' })}>
                {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <ShieldX className="h-4 w-4 mr-1" /> Disqualifier
              </Button>
            )}
          </div>
        </div>

        {/* Workflow progress */}
        <div className="flex items-center gap-1 flex-wrap">
          {flowSteps.map((step, i) => (
            <div key={step.status} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step.isCurrent ? 'bg-primary text-primary-foreground' :
                step.isCompleted ? 'bg-green-100 text-green-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {step.requiresESig && <ShieldAlert className="h-3 w-3" />}
                {step.status}
              </div>
              {i < flowSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="risk">Évaluation des risques</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Informations</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><span className="font-medium">{CATEGORY_LABELS[selected.category] || selected.category}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-medium">{selected.contact_name || '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span className="font-medium">{selected.contact_email || '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span className="font-medium">{selected.phone || '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Ville / Pays</span><span className="font-medium">{selected.city || ''}{selected.city && selected.country ? ', ' : ''}{selected.country || ''}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Star className="h-4 w-4" /> Qualification &amp; Évaluation</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Méthode de qualification</span><span className="font-medium">{QUAL_METHOD_LABELS[selected.qualification_method as QualificationMethod] || selected.qualification_method || '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Note / Score</span>
                    <span className="font-medium flex items-center gap-1">
                      <Star className={`h-4 w-4 ${selected.rating >= 80 ? 'text-green-600' : selected.rating >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                      {selected.rating != null ? `${selected.rating}/100` : '—'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Date de qualification</span><span className="font-medium">{fmtDate(selected.qualification_date || '')}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Prochaine évaluation</span><span className="font-medium">{fmtDate(selected.next_evaluation_date || '')}</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Documents du fournisseur</CardTitle></CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun document associé à ce fournisseur.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {documents.map((doc: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.name || doc.title || 'Document'}</p>
                            <p className="text-xs text-muted-foreground">{doc.type || doc.document_type || ''} {doc.expiry_date ? `· Expire : ${fmtDate(doc.expiry_date)}` : ''}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={doc.status === 'Valid' ? 'text-green-700' : doc.status === 'Expired' ? 'text-red-700' : ''}>
                          {doc.status || '—'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Évaluation des risques fournisseur</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selected.risk_assessment ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Risque global</p>
                        <p className="text-lg font-bold mt-1">{selected.risk_assessment.overall_risk || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Qualité</p>
                        <p className="text-lg font-bold mt-1">{selected.risk_assessment.quality_risk || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Approvisionnement</p>
                        <p className="text-lg font-bold mt-1">{selected.risk_assessment.supply_risk || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Réglementaire</p>
                        <p className="text-lg font-bold mt-1">{selected.risk_assessment.regulatory_risk || '—'}</p>
                      </div>
                    </div>
                    {selected.risk_assessment.notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Notes d&apos;évaluation</p>
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">{selected.risk_assessment.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune évaluation des risques disponible pour ce fournisseur.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ElectronicSignatureModal
          open={sigModal.open}
          title={sigModal.action === 'qualify' ? 'Qualifier le fournisseur' : 'Disqualifier le fournisseur'}
          description={sigModal.action === 'qualify'
            ? `Confirmez la qualification de "${selected.name}" avec votre signature électronique.`
            : `Confirmez la disqualification de "${selected.name}" avec votre signature électronique.`}
          recordId={selected.id}
          recordType="supplier"
          purpose={sigModal.action === 'qualify' ? 'approval' : 'rejection'}
          onConfirm={handleQualificationAction}
          onCancel={() => setSigModal({ open: false, action: 'qualify' })}
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
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">Gestion et qualification des fournisseurs · {items.length} fournisseur(s)</p>
        </div>
        <Button onClick={() => router.push('/qms/suppliers/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau fournisseur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{qualifiedCount}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><ShieldCheck className="h-3 w-3" /> Qualifiés</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{conditionalCount}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Conditionnels</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{disqualifiedCount}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><ShieldX className="h-3 w-3" /> Disqualifiés</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{evalCount}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><ShieldAlert className="h-3 w-3" /> En évaluation</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, numéro ou ville..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="Qualified">Qualifié</SelectItem>
                <SelectItem value="Conditional">Conditionnel</SelectItem>
                <SelectItem value="Disqualified">Disqualifié</SelectItem>
                <SelectItem value="Under Evaluation">En évaluation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
            <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucun fournisseur trouvé</p>
            <Button variant="outline" onClick={() => router.push('/qms/suppliers/new')}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {paged.map((s: any) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => loadDetail(s.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {SUPPLIER_STATUS_ICONS[s.status] || <Truck className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {s.supplier_number && <Badge variant="outline" className="font-mono text-xs">{s.supplier_number}</Badge>}
                        <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[s.category] || s.category}</Badge>
                      </div>
                      <h3 className="font-medium truncate">{s.name || '—'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {s.city && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.city}{s.country ? `, ${s.country}` : ''}</span>}
                        {s.rating != null && (
                          <span className="flex items-center gap-1">
                            <Star className={`h-3 w-3 ${s.rating >= 80 ? 'text-green-600' : s.rating >= 60 ? 'text-amber-500' : 'text-red-500'}`} />
                            {s.rating}/100
                          </span>
                        )}
                        {s.qualification_method && <span>{QUAL_METHOD_LABELS[s.qualification_method as QualificationMethod] || s.qualification_method}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
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