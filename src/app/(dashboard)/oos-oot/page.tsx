'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useModule } from '@/hooks/useModule'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, Plus, ChevronRight, ChevronDown, Check, X,
  FlaskConical, Search, FileText, AlertTriangle, CheckCircle2,
  XCircle, HelpCircle, RotateCcw, Clock, Loader2,
} from 'lucide-react'
import { getStatusColor } from '@/lib/status-colors'

// ─── Barr Decision Tree State ───────────────────────────────────────────────
type TreeNodeId =
  | 'start'
  | 'lab_error'
  | 'lab_error_yes'
  | 'lab_error_no'
  | 'assignable_cause'
  | 'assignable_yes'
  | 'assignable_no'
  | 'phase2_confirmed'
  | 'phase2_not_confirmed'

interface TreeNode {
  id: TreeNodeId
  label: string
  phase: 1 | 2
  type: 'question' | 'result' | 'action'
  yes?: TreeNodeId
  no?: TreeNodeId
  result?: string
  resultType?: 'success' | 'warning' | 'error' | 'info'
}

const TREE: Record<TreeNodeId, TreeNode> = {
  start: {
    id: 'start', label: 'Résultat OOS/OOT reçu', phase: 1, type: 'action',
    yes: 'lab_error',
  },
  lab_error: {
    id: 'lab_error', label: 'Erreur de laboratoire identifiée ?', phase: 1, type: 'question',
    yes: 'lab_error_yes', no: 'lab_error_no',
  },
  lab_error_yes: {
    id: 'lab_error_yes', label: 'Résultat invalide — Erreur de laboratoire confirmée', phase: 1,
    type: 'result', result: 'Résultat invalide. Échantillonnage requis.', resultType: 'warning',
  },
  lab_error_no: {
    id: 'lab_error_no', label: 'Cause assignable trouvée ?', phase: 1, type: 'question',
    yes: 'assignable_yes', no: 'assignable_no',
  },
  assignable_yes: {
    id: 'assignable_yes', label: 'Cause assignable identifiée', phase: 1,
    type: 'result', result: 'CAPA requise. Lier à une action corrective.', resultType: 'info',
  },
  assignable_no: {
    id: 'assignable_no', label: 'Aucune cause assignable — Passage à la Phase 2', phase: 1,
    type: 'result', result: 'Enquête à grande échelle requise.', resultType: 'warning',
  },
  phase2_confirmed: {
    id: 'phase2_confirmed', label: 'Résultat OOS confirmé ?', phase: 2, type: 'question',
    yes: 'assignable_yes', no: 'phase2_not_confirmed',
  },
  phase2_not_confirmed: {
    id: 'phase2_not_confirmed', label: 'Résultat OOS non confirmé', phase: 2,
    type: 'result', result: 'Résultat invalide. Lot peut être libéré.', resultType: 'success',
  },
}

const RESULT_ICONS: Record<string, any> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: HelpCircle,
}

export default function OosOotView() {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OOS' | 'OOT'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Detail view state
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  // Barr tree state
  const [treePath, setTreePath] = useState<TreeNodeId[]>(['start'])
  const [rootCauseText, setRootCauseText] = useState('')
  const [capaLink, setCapaLink] = useState('')
  const [savingTree, setSavingTree] = useState(false)

  const { items, loading, refetch } = useModule('oos_oot')

  const filteredItems = items.filter((item: any) => {
    const matchType = typeFilter === 'ALL' || item.oos_type === typeFilter
    const matchSearch = !search ||
      (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.oos_number || '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    setTreePath(['start'])
    setRootCauseText('')
    setCapaLink('')
    try {
      const m = api.module('oos_oot')
      const d = await m.getById(id)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const currentTreeNode = TREE[treePath[treePath.length - 1]]

  const handleTreeNodeClick = (nodeId: TreeNodeId, answer?: 'yes' | 'no') => {
    const node = TREE[nodeId]
    if (node.type !== 'question') return
    const nextId = answer === 'yes' ? node.yes! : node.no!
    setTreePath(prev => [...prev, nextId])
  }

  const handleTreeReset = () => setTreePath(['start'])

  const handleSaveTreeResult = async () => {
    if (!selectedId) return
    setSavingTree(true)
    try {
      const m = api.module('oos_oot')
      const lastNode = TREE[treePath[treePath.length - 1]]
      const isPhase2 = lastNode.phase === 2
      await m.update(selectedId, {
        phase1_conclusion: isPhase2 ? 'No Assignable Cause Found' : (treePath.length > 2 ? 'Assignable Cause Found' : 'Error Found'),
        phase2_conclusion: isPhase2 ? (treePath[treePath.length - 1] === 'phase2_not_confirmed' ? 'Invalidated' : 'Confirmed OOS') : 'Pending',
        root_cause: rootCauseText || undefined,
        capa_id: capaLink || undefined,
      })
      refetch()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSavingTree(false)
    }
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
  }

  // ─── Detail view ────────────────────────────────────────────────────────
  if (selectedId) {
    if (detailLoading) {
      return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); setDetail(null) }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6" />
              {detail?.oos_number || 'OOS/OOT'}
            </h1>
            <p className="text-sm text-muted-foreground">{detail?.title || 'Enquête OOS/OOT'}</p>
          </div>
          {detail?.status && (
            <Badge variant="outline" className={`text-xs ${getStatusColor(detail.status)}`}>{detail.status}</Badge>
          )}
        </div>

        {/* Progress indicator */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Progression de l&apos;enquête</span>
              {detail?.phase1_conclusion && (
                <Badge variant="outline" className="text-xs">Phase 1 terminée</Badge>
              )}
              {detail?.phase2_conclusion && detail?.phase2_conclusion !== 'Pending' && (
                <Badge variant="outline" className="text-xs">Phase 2 terminée</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (treePath.length / 5) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Étape {treePath.length} / 5
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Test result details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Détails du résultat d&apos;essai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <Badge variant={detail?.oos_type === 'OOS' ? 'destructive' : 'secondary'}>
                  {detail?.oos_type || 'OOS'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lot</p>
                <p className="text-sm font-medium">{detail?.batch_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Essai</p>
                <p className="text-sm font-medium">{detail?.test_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date du résultat</p>
                <p className="text-sm font-medium">{fmtDate(detail?.test_date)}</p>
              </div>
              {detail?.spec_limit && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Limite de spécification</p>
                  <p className="text-sm font-medium">{detail.spec_limit}</p>
                </div>
              )}
              {detail?.measured_value && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valeur mesurée</p>
                  <p className="text-sm font-medium text-red-600 font-mono">{detail.measured_value}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Barr Decision Tree */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" /> Arbre de décision Barr
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleTreeReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          </CardHeader>
          <CardContent>
            {/* Phase indicator */}
            <div className="flex gap-2 mb-6">
              <Badge variant={currentTreeNode?.phase === 1 ? 'default' : 'outline'} className="gap-1">
                Phase 1 — Investigation laboratoire
              </Badge>
              <Badge variant={currentTreeNode?.phase === 2 ? 'default' : 'outline'} className="gap-1">
                Phase 2 — Investigation complète
              </Badge>
            </div>

            {/* Decision tree visualization */}
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                {treePath.map((nodeId, index) => {
                  const node = TREE[nodeId]
                  const isLast = index === treePath.length - 1
                  const isQuestion = node.type === 'question'
                  const ResultIcon = RESULT_ICONS[node.resultType || 'info']

                  return (
                    <div key={`${nodeId}-${index}`} className="relative">
                      {/* Connecting line */}
                      {index > 0 && (
                        <div className="absolute left-6 -top-4 w-px h-4 bg-border" />
                      )}

                      <div
                        className={`
                          relative border rounded-lg p-4 transition-all
                          ${isQuestion
                            ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                            : node.resultType === 'success'
                              ? 'border-green-300 bg-green-50 dark:bg-green-950/30'
                              : node.resultType === 'warning'
                                ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                                : node.resultType === 'error'
                                  ? 'border-red-300 bg-red-50 dark:bg-red-950/30'
                                  : 'border-sky-300 bg-sky-50 dark:bg-sky-950/30'
                          }
                          ${isLast ? 'ring-2 ring-primary/20' : 'opacity-75'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                            ${node.phase === 1 ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-sky-200 text-sky-800 dark:bg-sky-800 dark:text-sky-200'}
                          `}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isQuestion ? '' : ''}`}>{node.label}</p>
                            {node.result && (
                              <p className="text-sm mt-1 text-muted-foreground">{node.result}</p>
                            )}

                            {/* Yes/No buttons for question nodes */}
                            {isQuestion && isLast && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => handleTreeNodeClick(nodeId, 'yes')}
                                >
                                  <Check className="h-3 w-3" /> Oui
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
                                  onClick={() => handleTreeNodeClick(nodeId, 'no')}
                                >
                                  <X className="h-3 w-3" /> Non
                                </Button>
                              </div>
                            )}

                            {/* Result icon for terminal nodes */}
                            {!isQuestion && (
                              <div className="mt-2">
                                <ResultIcon className={`h-5 w-5 ${
                                  node.resultType === 'success' ? 'text-green-600' :
                                  node.resultType === 'warning' ? 'text-amber-600' :
                                  node.resultType === 'error' ? 'text-red-600' : 'text-sky-600'
                                }`} />
                              </div>
                            )}

                            {/* Root cause input for assignable cause */}
                            {isLast && nodeId === 'assignable_yes' && (
                              <div className="mt-3 space-y-3">
                                <Textarea
                                  placeholder="Décrire la cause racine identifiée..."
                                  value={rootCauseText}
                                  onChange={e => setRootCauseText(e.target.value)}
                                  rows={3}
                                />
                                <div className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground mb-1">Lien CAPA</p>
                                    <Input
                                      placeholder="Identifiant CAPA (ex: CAPA-001)"
                                      value={capaLink}
                                      onChange={e => setCapaLink(e.target.value)}
                                    />
                                  </div>
                                  <Button onClick={handleSaveTreeResult} disabled={savingTree}>
                                    {savingTree ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                    Enregistrer
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Investigation timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Chronologie de l&apos;enquête
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-px h-full bg-border" />
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">Résultat OOS/OOT détecté</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(detail?.created_at)}</p>
                </div>
              </div>
              {detail?.phase1_conclusion && detail.phase1_conclusion !== 'Pending' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-px h-full bg-border" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">Phase 1 terminée</p>
                    <p className="text-xs text-muted-foreground">Conclusion : {detail.phase1_conclusion}</p>
                  </div>
                </div>
              )}
              {detail?.phase2_conclusion && detail.phase2_conclusion !== 'Pending' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phase 2 terminée</p>
                    <p className="text-xs text-muted-foreground">Conclusion : {detail.phase2_conclusion}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch disposition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disposition du lot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm font-medium">Lot</p>
                <p className="text-lg font-bold">{detail?.batch_number || '—'}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm font-medium">Disposition</p>
                <Badge variant={detail?.disposition === 'Released' ? 'default' : 'destructive'}>
                  {detail?.disposition || 'En attente'}
                </Badge>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-sm font-medium">Statut</p>
                <Badge variant="outline" className={getStatusColor(detail?.status || 'Open')}>
                  {detail?.status || 'Open'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── List view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" /> OOS / OOT
          </h1>
          <p className="text-sm text-muted-foreground">Enquêtes sur les résultats hors spécification · {filteredItems.length} enregistrement(s)</p>
        </div>
        <Button onClick={() => router.push('/qms/oos_oot/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle enquête
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Rechercher par numéro ou titre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="OOS">OOS</SelectItem>
                <SelectItem value="OOT">OOT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucune enquête OOS/OOT</p>
            <Button variant="outline" onClick={() => router.push('/qms/oos_oot/new')}>
              <Plus className="h-4 w-4 mr-2" /> Créer la première
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item: any) => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelect(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {item.oos_number && (
                        <Badge variant="outline" className="font-mono text-xs">{item.oos_number}</Badge>
                      )}
                      <Badge variant={item.oos_type === 'OOS' ? 'destructive' : 'secondary'} className="text-xs">
                        {item.oos_type || 'OOS'}
                      </Badge>
                      {item.status && (
                        <Badge variant="outline" className={`text-xs ${getStatusColor(item.status)}`}>
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium truncate">{item.title || item.test_name || '—'}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {item.batch_number && (
                        <p className="text-xs text-muted-foreground">Lot : {item.batch_number}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{fmtDate(item.created_at || item.createdAt)}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}