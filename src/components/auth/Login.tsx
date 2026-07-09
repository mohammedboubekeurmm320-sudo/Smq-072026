'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { INDUSTRY_CONFIG, type IndustryType } from '@/types/qms'
import { ShieldCheck, Building2, User, AlertCircle, Info, Globe } from 'lucide-react'

export function Login() {
  const { login, signup } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [reg, setReg] = useState({
    organizationName: '', industry: 'medical_device' as IndustryType,
    fullName: '', email: '', password: '',
  })
  const [regLoading, setRegLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const r = await login(email, password)
    setLoading(false)
    if (r.ok) toast({ title: 'Connexion réussie' })
    else toast({ title: r.error || 'Erreur', variant: 'destructive' })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegLoading(true)
    const r = await signup(reg.email, reg.password, reg.fullName, reg.organizationName, reg.industry)
    setRegLoading(false)
    if (r.ok) toast({ title: 'Organisation créée' })
    else toast({ title: r.error || 'Erreur', variant: 'destructive' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        {/* Hero */}
        <div className="hidden lg:flex flex-col justify-center p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-600 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">QMS ISO 13485 Pro</h1>
              <p className="text-sm text-muted-foreground">Système de Management de la Qualité</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3">Pilotez votre conformité aux normes médicales et pharmaceutiques</h2>
          <p className="text-muted-foreground mb-6">
            Plateforme complète multi-organisation, multi-tenant, conforme ISO 13485:2016, ISO 14971, ICH Q10, IVDR.
            Documents, CAPA, NCR, déviations, audits, risques, formations, fournisseurs, dossiers de lot —
            avec signatures électroniques 21 CFR Part 11, audit trail blockchain, et système de liens polymorphiques entre enregistrements.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, label: 'ISO 13485:2016' },
              { icon: AlertCircle, label: 'ISO 14971 Risques' },
              { icon: Building2, label: 'Multi-organisation' },
              { icon: User, label: '6 rôles & 49 permissions' },
              { icon: Globe, label: 'Multi-industrie (DM, Pharma, IVD)' },
              { icon: ShieldCheck, label: 'Signatures 21 CFR Part 11' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                <f.icon className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Accès à votre espace</CardTitle>
            <CardDescription>Connectez-vous ou créez une nouvelle organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Nouvelle organisation</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="grid gap-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.fr" />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Connexion…' : 'Se connecter'}
                  </Button>
                  <div className="mt-2 p-3 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    <Info className="h-3 w-3 inline mr-1" />
                    Comptes démo :<br />
                    <code>admin@mediquality.fr</code><br />
                    <code>quality@mediquality.fr</code><br />
                    <code>doc@mediquality.fr</code> (Document Controller)<br />
                    <code>auditor@mediquality.fr</code><br />
                    <code>operator@mediquality.fr</code><br />
                    Mot de passe : <code>admin123</code>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleSignup} className="grid gap-3">
                  <div className="text-sm font-medium text-muted-foreground border-l-2 border-emerald-500 pl-2">Organisation</div>
                  <div>
                    <Label>Nom de l'organisation *</Label>
                    <Input required value={reg.organizationName} onChange={e => setReg({ ...reg, organizationName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Industrie</Label>
                    <select className="w-full px-3 py-2 border rounded-md bg-background text-sm" value={reg.industry} onChange={e => setReg({ ...reg, industry: e.target.value as IndustryType })}>
                      {Object.entries(INDUSTRY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground border-l-2 border-emerald-500 pl-2 mt-2">Administrateur</div>
                  <div>
                    <Label>Nom complet *</Label>
                    <Input required value={reg.fullName} onChange={e => setReg({ ...reg, fullName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" required value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Mot de passe *</Label>
                      <Input type="password" required value={reg.password} onChange={e => setReg({ ...reg, password: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" disabled={regLoading} className="w-full">
                    {regLoading ? 'Création…' : 'Créer l\'organisation'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Le premier utilisateur créé sera automatiquement administrateur. Les modules recommandés pour l'industrie sélectionnée seront activés.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
