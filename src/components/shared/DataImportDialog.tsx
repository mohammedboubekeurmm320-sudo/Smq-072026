'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, FileSpreadsheet, X, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataImportDialogProps {
  open: boolean
  entityType: string
  onClose: () => void
  onImportComplete?: () => void
  /** Available target fields to map CSV columns to */
  targetFields?: string[]
}

type ImportStep = 'upload' | 'mapping' | 'importing' | 'done'

export function DataImportDialog({
  open,
  entityType,
  onClose,
  onImportComplete,
  targetFields = [],
}: DataImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<number, string>>({})
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setRows([])
    setCsvHeaders([])
    setMapping({})
    setProgress(0)
    setError('')
  }, [])

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      setError('Le fichier doit contenir au moins un en-tête et une ligne de données.')
      return
    }
    const headerRow = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const dataRows = lines.slice(1, 6).map((line) =>
      line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    )
    setCsvHeaders(headerRow)
    setRows(dataRows)
    setStep('mapping')
  }

  const handleFile = (f: File) => {
    setError('')
    if (!f.name.endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV.')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    setStep('importing')
    setProgress(0)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('entityType', entityType)
      formData.append('mapping', JSON.stringify(mapping))

      // Simulate progress for UX; real progress from API would be better
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90))
      }, 200)

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })
      clearInterval(interval)

      if (res.ok) {
        setProgress(100)
        setStep('done')
        onImportComplete?.()
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Erreur lors de l'importation.")
        setStep('upload')
      }
    } catch {
      setError('Erreur de connexion au serveur.')
      setStep('upload')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des {entityLabel}s</DialogTitle>
          <DialogDescription>
            Importez des données depuis un fichier CSV.
          </DialogDescription>
        </DialogHeader>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <Upload className={cn('h-10 w-10', dragOver ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Glissez-déposez votre fichier CSV ici
                </p>
                <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>

            {file && step === 'upload' && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Mapping step */}
        {step === 'mapping' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Associez les colonnes du CSV aux champs de l&apos;entité <strong>{entityLabel}</strong>.
            </p>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colonne CSV</TableHead>
                    <TableHead className="w-12" />
                    <TableHead>Champ cible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvHeaders.map((header, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{header}</TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[idx] ?? '__skip__'}
                          onValueChange={(v) =>
                            setMapping((m) => ({ ...m, [idx]: v === '__skip__' ? '' : v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">— Ignorer —</SelectItem>
                            {targetFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Preview first 5 rows */}
            {rows.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Aperçu (5 premières lignes)</Label>
                <div className="mt-1.5 rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvHeaders.map((h, i) => (
                          <TableHead key={i} className="text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, ri) => (
                        <TableRow key={ri}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci} className="text-xs font-mono max-w-[150px] truncate">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setStep('upload'); setRows([]); setCsvHeaders([]) }}>
                Retour
              </Button>
              <Button onClick={handleImport}>
                <Upload className="mr-1.5 h-4 w-4" />
                Importer
              </Button>
            </div>
          </div>
        )}

        {/* Importing step */}
        {step === 'importing' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Importation en cours…</p>
            <div className="w-full max-w-xs">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center mt-2">{progress}%</p>
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="space-y-4 py-8 flex flex-col items-center">
            <div className="rounded-full bg-emerald-100 p-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium">Importation terminée avec succès !</p>
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}