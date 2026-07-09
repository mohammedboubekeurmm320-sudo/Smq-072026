'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { ShieldCheck, Building2, User, AlertCircle, Info } from 'lucide-react'

export function Login() {
  const { toast } = useToast()
  const { fetchUser } = useAuth()

  // Login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Register form (first admin)
  const [reg, setReg] = useState({
    organizationName: '', address: '', city: '', country: '', type: 'manufacturer',
    contactEmail: '', contactPhone: '',
    userName: '', email: '', password: '', position: '', department: ''
  })
  const [regLoading, setRegLoading] = useState(false)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    })
    setLoading(false)
    if (r.ok) {
      await fetchUser()
      toast({ title: 'Connexion réussie' })
    } else {
      const d = await r.json()
      toast({ title: d.error || 'Erreur', variant: 'destructive' })
    }
  }

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegLoading(true)
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register-first-admin', ...reg })
    })
    setRegLoading(false)
    if (r.ok) {
      await fetchUser()
      toast({ title: 'Organisation créée avec succès' })
    } else {
      const d = await r.json()
      toast({ title: d.error || 'Erreur', variant: 'destructive' })
    }
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
              <h1 className="text-2xl font-bold">QMS ISO 13485</h1>
              <p className="text-sm text-muted-foreground">Système de Management de la Qualité</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-3">Gérez votre conformité aux normes médicales</h2>
          <p className="text-muted-foreground mb-6">
            Plateforme complète pour piloter votre SMQ selon ISO 13485 et d'autres normes (ISO 14971, ISO 9001, IEC 62304…).
            Documents, risques, audits, non-conformités, CAPA, formations, fournisseurs et processus.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, label: 'ISO 13485:2016' },
              { icon: AlertCircle, label: 'ISO 14971' },
              { icon: Building2, label: 'Multi-organisations' },
              { icon: User, label: 'Rôles & permissions' }
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                <f.icon className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forms */}
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

              {/* Login */}
              <TabsContent value="login" className="mt-4">
                <form onSubmit={login} className="grid gap-3">
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
                    Comptes démo: <br />
                    <code>admin@mediquality.fr</code> · <code>quality@mediquality.fr</code> · <code>engineer@mediquality.fr</code> · <code>auditor@mediquality.fr</code> — mot de passe: <code>admin123</code>
                  </div>
                </form>
              </TabsContent>

              {/* Register */}
              <TabsContent value="register" className="mt-4 max-h-[60vh] overflow-y-auto">
                <form onSubmit={register} className="grid gap-3">
                  <div className="text-sm font-medium text-muted-foreground border-l-2 border-emerald-500 pl-2">
                    Organisation
                  </div>
                  <div>
                    <Label>Nom de l'organisation *</Label>
                    <Input required value={reg.organizationName} onChange={e => setReg({ ...reg, organizationName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <select className="w-full px-3 py-2 border rounded-md bg-background text-sm" value={reg.type} onChange={e => setReg({ ...reg, type: e.target.value })}>
                        <option value="manufacturer">Fabricant</option>
                        <option value="distributor">Distributeur</option>
                        <option value="service_provider">Prestataire</option>
                        <option value="importer">Importateur</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <Label>Pays</Label>
                      <Input value={reg.country} onChange={e => setReg({ ...reg, country: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input value={reg.address} onChange={e => setReg({ ...reg, address: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Ville</Label>
                      <Input value={reg.city} onChange={e => setReg({ ...reg, city: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email contact</Label>
                      <Input type="email" value={reg.contactEmail} onChange={e => setReg({ ...reg, contactEmail: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={reg.contactPhone} onChange={e => setReg({ ...reg, contactPhone: e.target.value })} />
                  </div>

                  <div className="text-sm font-medium text-muted-foreground border-l-2 border-emerald-500 pl-2 mt-2">
                    Administrateur
                  </div>
                  <div>
                    <Label>Nom complet *</Label>
                    <Input required value={reg.userName} onChange={e => setReg({ ...reg, userName: e.target.value })} />
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Poste</Label>
                      <Input value={reg.position} onChange={e => setReg({ ...reg, position: e.target.value })} placeholder="Directeur" />
                    </div>
                    <div>
                      <Label>Département</Label>
                      <Input value={reg.department} onChange={e => setReg({ ...reg, department: e.target.value })} placeholder="Direction" />
                    </div>
                  </div>
                  <Button type="submit" disabled={regLoading} className="w-full">
                    {regLoading ? 'Création…' : 'Créer l\'organisation'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Le premier utilisateur créé sera automatiquement administrateur de l'organisation.
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
