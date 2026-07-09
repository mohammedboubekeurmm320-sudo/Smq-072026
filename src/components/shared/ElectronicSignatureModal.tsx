'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description: string
  onConfirm: (password: string, signatureHash: string) => void
  onCancel: () => void
}

export function ElectronicSignatureModal({ open, title, description, onConfirm, onCancel }: Props) {
  const { profile, login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!profile) return
    setError('')
    setSubmitting(true)
    // Verify password by attempting login
    const r = await login(profile.email, password)
    setSubmitting(false)
    if (!r.ok) {
      setError('Mot de passe incorrect')
      return
    }
    // Generate signature hash
    const hash = `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    onConfirm(password, hash)
    setPassword('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Signature électronique 21 CFR Part 11</p>
              <p>Cette action sera signée électroniquement et enregistrée dans la piste d'audit immuable. Votre identité sera associée à cette signature de manière permanente.</p>
            </div>
          </div>
          <div>
            <Label>Signataire</Label>
            <div className="text-sm font-medium mt-1">{profile?.fullName} ({profile?.role})</div>
          </div>
          <div>
            <Label htmlFor="esig-pwd">Mot de passe (confirmation)</Label>
            <Input id="esig-pwd" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Saisissez votre mot de passe" autoFocus />
          </div>
          {error && (
            <div className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setPassword(''); onCancel() }}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!password || submitting}>
            {submitting ? 'Vérification…' : 'Signer électroniquement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
