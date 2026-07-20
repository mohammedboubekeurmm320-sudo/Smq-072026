'use client'

import { useState, useMemo, useCallback } from 'react'
import { useModule } from '@/hooks/useModule'
import { getStatusColor } from '@/lib/status-colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  ChevronRight, ChevronDown, FolderOpen, FolderClosed,
  FileText, Search, Expand, ShrinkPlus, Link2, Unlink,
} from 'lucide-react'

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; dot: string }> = {
  1: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  2: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-l-teal-500', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  3: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-l-cyan-500', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  4: { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-l-slate-400', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
}

const LEVEL_LABELS: Record<number, { fr: string }> = {
  1: { fr: 'N1 - Strategique' },
  2: { fr: 'N2 - Transversal' },
  3: { fr: 'N3 - Metier / Technique' },
  4: { fr: 'N4 - Enregistrement' },
}

interface TreeNode {
  id: string
  documentNumber?: string
  title: string
  docType: string
  status: string
  level: number
  parentDocumentId: string | null
  children: TreeNode[]
}

function buildTree(docs: any[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []
  for (const doc of docs) {
    map.set(doc.id, {
      id: doc.id,
      documentNumber: doc.document_number,
      title: doc.title,
      docType: doc.doc_type || doc.type || '',
      status: doc.status,
      level: doc.document_level || doc.level || 4,
      parentDocumentId: doc.parent_document_id || null,
      children: [],
    })
  }
  for (const node of map.values()) {
    if (node.parentDocumentId && map.has(node.parentDocumentId)) {
      map.get(node.parentDocumentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title))
    for (const n of nodes) sortNodes(n.children)
  }
  sortNodes(roots)
  return roots
}

function TreeNodeRow({ node, depth, expanded, onToggle, onSelect, selectedId }: {
  node: TreeNode; depth: number; expanded: Set<string>
  onToggle: (id: string) => void; onSelect: (node: TreeNode) => void; selectedId: string | null
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const isSelected = selectedId === node.id
  const colors = LEVEL_COLORS[node.level] || LEVEL_COLORS[4]
  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'} ${colors.bg} border-l-4 ${colors.border}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        <button className="w-5 h-5 flex items-center justify-center shrink-0" onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}>
          {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />) : <span className="w-4" />}
        </button>
        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
        {hasChildren ? (isExpanded ? <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" /> : <FolderClosed className="w-4 h-4 shrink-0 text-muted-foreground" />) : (<FileText className="w-4 h-4 shrink-0 text-muted-foreground" />)}
        <span className="flex-1 min-w-0">
          {node.documentNumber && <span className="text-xs font-mono text-muted-foreground mr-2">{node.documentNumber}</span>}
          <span className={`text-sm font-medium truncate ${isSelected ? 'text-foreground' : ''}`}>{node.title}</span>
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex">{node.docType}</Badge>
        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${colors.text}`}>{LEVEL_LABELS[node.level]?.fr || `N${node.level}`}</Badge>
        <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${getStatusColor(node.status)}`}>{node.status}</Badge>
      </div>
      {hasChildren && isExpanded && <div>{node.children.map(child => <TreeNodeRow key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onSelect={onSelect} selectedId={selectedId} />)}</div>}
    </div>
  )
}

function DocumentDetailPanel({ node, onClose }: { node: TreeNode; onClose: () => void }) {
  const colors = LEVEL_COLORS[node.level] || LEVEL_COLORS[4]
  return (
    <Card className="border-l-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{node.documentNumber && <span className="font-mono text-muted-foreground mr-2">{node.documentNumber}</span>}{node.title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Type:</span> {node.docType}</div>
          <div><span className="text-muted-foreground">Statut:</span> <Badge className={getStatusColor(node.status)}>{node.status}</Badge></div>
          <div><span className="text-muted-foreground">Niveau:</span> <Badge variant="secondary" className={colors.text}>{LEVEL_LABELS[node.level]?.fr}</Badge></div>
          <div><span className="text-muted-foreground">Enfants:</span> {node.children.length} document(s)</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DocumentHierarchyView() {
  const { items, loading, update } = useModule('/documents')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<TreeNode | null>(null)
  const [linkChildId, setLinkChildId] = useState('')

  const tree = useMemo(() => buildTree(items), [items])

  const filteredTree = useMemo(() => {
    const q = search.toLowerCase()
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch = !q || node.title.toLowerCase().includes(q) || (node.documentNumber || '').toLowerCase().includes(q)
      const matchesLevel = levelFilter === 'ALL' || String(node.level) === levelFilter
      const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as TreeNode[]
      if (matchesSearch && matchesLevel && matchesStatus) return { ...node, children: filteredChildren }
      if (filteredChildren.length > 0) return { ...node, children: filteredChildren }
      return null
    }
    return tree.map(filterNode).filter(Boolean) as TreeNode[]
  }, [tree, search, levelFilter, statusFilter])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [])

  const expandAll = useCallback(() => {
    const all = new Set<string>(); const collect = (nodes: TreeNode[]) => { for (const n of nodes) { all.add(n.id); collect(n.children) } }; collect(filteredTree); setExpanded(all)
  }, [filteredTree])

  const collapseAll = useCallback(() => setExpanded(new Set()), [])

  const handleLink = useCallback(async () => {
    if (!selectedId || !linkChildId) return
    await update(linkChildId, { parent_document_id: selectedId } as any)
    setLinkDialogOpen(false); setLinkChildId('')
  }, [selectedId, linkChildId, update])

  const handleUnlink = useCallback(async () => {
    if (!unlinkTarget) return
    await update(unlinkTarget.id, { parent_document_id: null } as any)
    setUnlinkTarget(null)
  }, [unlinkTarget, update])

  const selectedNode = useMemo(() => {
    if (!selectedId) return null
    const find = (nodes: TreeNode[]): TreeNode | null => { for (const n of nodes) { if (n.id === selectedId) return n; const found = find(n.children); if (found) return found } return null }
    return find(filteredTree)
  }, [selectedId, filteredTree])

  const orphanCount = useMemo(() => items.filter((d: any) => { const lvl = d.document_level || d.level || 4; const pid = d.parent_document_id; return !pid && lvl >= 3 }).length, [items])

  if (loading) {
    return (<div className="space-y-4 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-full" />{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>)
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hierarchie Documentaire</h2>
          <p className="text-sm text-muted-foreground">Arborescence multi-niveaux (ISO 13485 §4.2.1) - {items.length} documents, {orphanCount} sans parent</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}><Expand className="w-4 h-4 mr-1" /> Tout developper</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}><ShrinkPlus className="w-4 h-4 mr-1" /> Tout reduire</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par titre ou numero..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les niveaux</SelectItem>
            <SelectItem value="1">N1 - Strategique</SelectItem>
            <SelectItem value="2">N2 - Transversal</SelectItem>
            <SelectItem value="3">N3 - Metier / Technique</SelectItem>
            <SelectItem value="4">N4 - Enregistrement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Effective">Effective</SelectItem>
            <SelectItem value="Obsolete">Obsolete</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-lg p-2 max-h-[70vh] overflow-y-auto">
          {filteredTree.length === 0 ? (<div className="flex items-center justify-center h-40 text-muted-foreground">Aucun document ne correspond aux filtres.</div>) : (filteredTree.map(node => <TreeNodeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggleExpand} onSelect={(n) => setSelectedId(n.id === selectedId ? null : n.id)} selectedId={selectedId} />))}
        </div>
        <div className="space-y-4">
          {selectedNode ? (<>
            <DocumentDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setLinkDialogOpen(true)}><Link2 className="w-4 h-4 mr-1" /> Lier un enfant</Button>
              {selectedNode.parentDocumentId && <Button variant="outline" size="sm" className="flex-1" onClick={() => setUnlinkTarget(selectedNode)}><Unlink className="w-4 h-4 mr-1" /> Detacher du parent</Button>}
            </div>
          </>) : (<Card className="p-6 text-center text-muted-foreground text-sm">Selectionnez un document dans l'arborescence pour voir ses details.</Card>)}
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Legende des niveaux</CardTitle></CardHeader><CardContent className="space-y-2">{Object.entries(LEVEL_LABELS).map(([level, labels]) => { const c = LEVEL_COLORS[Number(level)]!; return (<div key={level} className="flex items-center gap-2 text-sm"><span className={`w-3 h-3 rounded-full ${c.dot}`} /><span className={c.text}>{labels.fr}</span></div>) })}</CardContent></Card>
        </div>
      </div>
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Lier un document enfant</DialogTitle><DialogDescription>Selectionnez un document a rattacher sous "{selectedNode?.title}".</DialogDescription></DialogHeader>
        <div className="space-y-3"><Select value={linkChildId} onValueChange={setLinkChildId}><SelectTrigger><SelectValue placeholder="Choisir un document..." /></SelectTrigger><SelectContent>{(items as any[]).filter((d: any) => d.id !== selectedId).sort((a: any, b: any) => a.title.localeCompare(b.title)).map((d: any) => (<SelectItem key={d.id} value={d.id}>{(d.document_number || '') + ' - ' + d.title}</SelectItem>))}</SelectContent></Select></div>
        <DialogFooter><Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Annuler</Button><Button onClick={handleLink} disabled={!linkChildId}>Lier</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!unlinkTarget} onOpenChange={() => setUnlinkTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Detacher du parent</DialogTitle><DialogDescription>Voulez-vous detacher "{unlinkTarget?.title}" de son document parent ?</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setUnlinkTarget(null)}>Annuler</Button><Button variant="destructive" onClick={handleUnlink}>Detacher</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}
