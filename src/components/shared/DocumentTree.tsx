'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface DocTreeNode {
  id: string
  title: string
  document_number: string
  document_type: string
  status: string
  version: number
  parent_document_id?: string | null
  children?: DocTreeNode[]
}

const TYPE_COLORS: Record<string, string> = {
  SOP: 'bg-blue-500',
  Form: 'bg-green-500',
  Record: 'bg-amber-500',
  Policy: 'bg-purple-500',
  Procedure: 'bg-cyan-500',
  'Work Instruction': 'bg-teal-500',
  Specification: 'bg-indigo-500',
  Template: 'bg-pink-500',
  Manual: 'bg-lime-600',
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-400',
  'Under Review': 'bg-amber-400',
  Approved: 'bg-green-500',
  Effective: 'bg-blue-500',
  Obsolete: 'bg-red-500',
  Superseded: 'bg-red-400',
}

interface DocumentTreeProps {
  documents: DocTreeNode[]
  selectedId?: string
  onSelect?: (doc: DocTreeNode) => void
  className?: string
}

function buildTree(docs: DocTreeNode[]): DocTreeNode[] {
  const map = new Map<string, DocTreeNode & { children: DocTreeNode[] }>()
  const roots: DocTreeNode[] = []

  docs.forEach(d => map.set(d.id, { ...d, children: [] }))
  docs.forEach(d => {
    const node = map.get(d.id)!
    const parentId = d.parent_document_id
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function filterTree(nodes: DocTreeNode[], q: string): DocTreeNode[] {
  if (!q) return nodes
  const lower = q.toLowerCase()
  return nodes.reduce<DocTreeNode[]>((acc, node) => {
    const childMatches = filterTree(node.children || [], q)
    const selfMatch =
      node.title.toLowerCase().includes(lower) ||
      node.document_number.toLowerCase().includes(lower)
    if (selfMatch || childMatches.length > 0) {
      acc.push({ ...node, children: childMatches })
    }
    return acc
  }, [])
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
}: {
  node: DocTreeNode
  depth: number
  selectedId?: string
  onSelect?: (doc: DocTreeNode) => void
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
}) {
  const hasChildren = (node.children || []).length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = node.id === selectedId
  const typeColor = TYPE_COLORS[node.document_type] || 'bg-gray-400'
  const statusColor = STATUS_COLORS[node.status] || 'bg-gray-400'

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) toggleExpand(node.id)
          onSelect?.(node)
        }}
        className={`
          w-full text-left flex items-center gap-1.5 py-1.5 px-2 rounded-md transition-colors text-sm
          ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/50'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand chevron */}
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Type dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${typeColor}`} />

        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />

        {/* Doc number */}
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {node.document_number}
        </span>

        {/* Title */}
        <span className="truncate flex-1">{node.title}</span>

        {/* Version */}
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0 border-dashed">
          v{node.version || 1}
        </Badge>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-border ml-3">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DocumentTree({
  documents,
  selectedId,
  onSelect,
  className = '',
}: DocumentTreeProps) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildTree(documents), [documents])
  const filtered = useMemo(() => {
    const result = filterTree(tree, search)
    // Auto-expand all when searching
    if (search) {
      const allIds = new Set<string>()
      const collectIds = (nodes: DocTreeNode[]) => {
        nodes.forEach(n => {
          allIds.add(n.id)
          if (n.children) collectIds(n.children)
        })
      }
      collectIds(result)
      setExpandedIds(allIds)
    }
    return result
  }, [tree, search])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (documents.length === 0) {
    return (
      <div className={`p-4 text-sm text-muted-foreground ${className}`}>
        Aucun document hiérarchique trouvé.
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder="Rechercher dans l'arbre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <ScrollArea className="max-h-[400px]">
        {filtered.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">
            Aucun résultat pour &laquo;{search}&raquo;
          </p>
        )}
      </ScrollArea>
    </div>
  )
}