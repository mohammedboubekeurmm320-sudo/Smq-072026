'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPut } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, Save, Loader2, Building2, Settings, ShieldCheck,
  Bell, Upload, Check, Lock,
} from 'lucide-react'
import { INDUSTRY_CONFIG, CORE_MODULES, OPTIONAL_MODULES, type IndustryType, type ModuleKey } from '@/types/qms'

const MODULE_LABELS: Record<string, { fr: string; desc: string }> = {
  documents: { fr: 'Documents', desc: 'Maîtrise des documents et enregistrements (§4.2)' },
  capa: { fr: 'CAPAs', desc: 'Actions correctives et préventives (§8.5.2/§8.5.3)' },
  ncr: { fr: 'Non-Conformités', desc: 'Maîtrise du produit non conforme (§8.3)' },
  audits: { fr: 'Audits', desc: 'Audits internes et externes (§8.2.4)' },
  training: { fr: 'Formations', desc: 'Formation et compétence (§6.2)' },
  reports: { fr: 'Rapports', desc: 'Centre de rapports et analyses qualité' },
  compliance: { fr: 'Conformité', desc: 'Suivi de la conformité réglementaire' },
  risks: { fr: 'Risques', desc: 'Management des risques (§7.1 / ISO 14971)' },
  hierarchy: { fr: 'Hiérarchie', desc: 'Arborescence documentaire multi-niveaux' },
  batch_records: { fr: 'Dossiers de Lot', desc: 'Dossiers de lot et traçabilité (§7.5.1)' },
  suppliers: { fr: 'Fournisseurs', desc: 'Évaluation et gestion fournisseurs (§7.4)' },
  forms: { fr: 'Formulaires', desc: 'Formulaires personnalisables et instances' },
  change_control: { fr: 'Contrôles Changement', desc: 'Maîtrise des modifications (§7.3.7)' },
  deviations: { fr: 'Déviations', desc: 'Déviations planifiées et non planifiées' },
  oos_oot: { fr: 'OOS/OOT', desc: 'Résultats hors spécification et tendances' },
}

const ORG_SIZES = [
  { value: '1-10', label: '1-10 employés' },
  { value: '11-50', label: '11-50 employés' },
  { value: '51-200', label: '51-200 employés' },
  { value: '201-1000', label: '201-1000 employés' },
  { value: '1000+', label: '1000+ employés' },
]

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user: profile, currentOrgId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [savingTab, setSavingTab] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tab: string; text: string; ok: boolean } | null>(null)

  // ─── Général tab state ───────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [orgSize, setOrgSize] = useState('')
  const [industryType, setIndustryType] = useState<IndustryType>('medical_device')

  // ─── Modules tab state ───────────────────────────────────────────────────
  const [activeModules, setActiveModules] = useState<ModuleKey[]>([])

  // ─── Sécurité tab state ──────────────────────────────────────────────────
  const [minPasswordLength, setMinPasswordLength] = useState(8)
  const [requireUppercase, setRequireUppercase] = useState(true)
  const [requireNumbers, setRequireNumbers] = useState(true)
  const [requireSpecial, setRequireSpecial] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [auditRetention, setAuditRetention] = useState(36)

  // ─── Notifications tab state ─────────────────────────────────────────────
  const [notifCapaOverdue, setNotifCapaOverdue] = useState(true)
  const [notifNcrOverdue, setNotifNcrOverdue] = useState(true)
  const [notifDocExpiry, setNotifDocExpiry] = useState(true)
  const [notifTrainingOverdue, setNotifTrainingOverdue] = useState(true)
  const [notifAuditDue, setNotifAuditDue] = useState(true)

  useEffect(() => {
    if (!currentOrgId) return
    setLoading(true)
    apiGet<any>(`/api/organizations`)
      .then((data: any) => {
        const org = Array.isArray(data) ? data[0] : data?.items?.[0] || data
        if (org) {
          setCompanyName(org.name || org.company_name || '')
          setCountry(org.country || '')
          setCity(org.city || '')
          setOrgSize(org.org_size || '')
          if (org.industry_type) setIndustryType(org.industry_type)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Load settings
    apiGet<any>(`/api/admin/settings`).then((settings: any) => {
      if (settings) {
        if (settings.active_modules) setActiveModules(settings.active_modules)
        if (settings.min_password_length) setMinPasswordLength(settings.min_password_length)
        if (settings.session_timeout) setSessionTimeout(settings.session_timeout)
        if (settings.two_factor_enabled !== undefined) setTwoFactorEnabled(settings.two_factor_enabled)
        if (settings.audit_retention) setAuditRetention(settings.audit_retention)
        if (settings.notifications) {
          const n = settings.notifications
          if (n.capa_overdue !== undefined) setNotifCapaOverdue(n.capa_overdue)
          if (n.ncr_overdue !== undefined) setNotifNcrOverdue(n.ncr_overdue)
          if (n.document_expiry !== undefined) setNotifDocExpiry(n.document_expiry)
          if (n.training_overdue !== undefined) setNotifTrainingOverdue(n.training_overdue)
          if (n.audit_due !== undefined) setNotifAuditDue(n.audit_due)
        }
      }
    }).catch(() => {})
  }, [currentOrgId])

  const saveTab = async (tab: string, data: any) => {
    if (!currentOrgId) return
    setSavingTab(tab)
    setMessage(null)
    try {
      await apiPut(`/api/admin/settings`, data)
      setMessage({ tab, text: 'Paramètres sauvegardés avec succès', ok: true })
    } catch (err: any) {
      setMessage({ tab, text: err.message || 'Erreur lors de la sauvegarde', ok: false })
    } finally {
      setSavingTab(null)
    }
  }

  const handleSaveGeneral = () => saveTab('general', {
    company_name: companyName,
    country,
    city,
    org_size: orgSize,
    industry_type: industryType,
  })

  const handleSaveModules = () => saveTab('modules', {
    active_modules: activeModules,
  })

  const handleSaveSecurity = () => saveTab('security', {
    min_password_length: minPasswordLength,
    require_uppercase: requireUppercase,
    require_numbers: requireNumbers,
    require_special: requireSpecial,
    session_timeout: sessionTimeout,
    two_factor_enabled: twoFactorEnabled,
    audit_retention: auditRetention,
  })

  const handleSaveNotifications = () => saveTab('notifications', {
    notifications: {
      capa_overdue: notifCapaOverdue,
      ncr_overdue: notifNcrOverdue,
      document_expiry: notifDocExpiry,
      training_overdue: notifTrainingOverdue,
      audit_due: notifAuditDue,
    },
  })

  const toggleModule = (mod: ModuleKey) => {
    setActiveModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Tableau de bord
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">Configuration de l&apos;organisation et des modules</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* ─── Général ─────────────────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Informations de l&apos;organisation
              </CardTitle>
              <CardDescription>Informations générales et type d&apos;industrie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Nom de l&apos;entreprise</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="mt-1" placeholder="Nom de l'organisation" />
                </div>
                <div>
                  <Label className="text-sm">Type d&apos;industrie</Label>
                  <Select value={industryType} onValueChange={v => setIndustryType(v as IndustryType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDUSTRY_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label} — {cfg.primaryStandard}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Pays</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} className="mt-1" placeholder="Ex: France" />
                </div>
                <div>
                  <Label className="text-sm">Ville</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1" placeholder="Ex: Paris" />
                </div>
                <div>
                  <Label className="text-sm">Taille de l&apos;organisation</Label>
                  <Select value={orgSize} onValueChange={setOrgSize}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {ORG_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Logo de l&apos;entreprise</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      <Upload className="h-4 w-4" />
                    </div>
                    <Button variant="outline" size="sm" disabled>Télécharger (bientôt)</Button>
                  </div>
                </div>
              </div>

              {message?.tab === 'general' && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={savingTab === 'general'}>
                  {savingTab === 'general' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Modules ─────────────────────────────────────────────────────── */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" /> Modules actifs
              </CardTitle>
              <CardDescription>Activer ou désactiver les modules du système de management de la qualité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core modules */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Cœur</Badge> Modules de base
                </h3>
                <div className="grid gap-2">
                  {CORE_MODULES.map(mod => {
                    const info = MODULE_LABELS[mod] || { fr: mod, desc: '' }
                    const isActive = activeModules.includes(mod as ModuleKey)
                    return (
                      <div key={mod} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{info.fr}</p>
                          <p className="text-xs text-muted-foreground">{info.desc}</p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleModule(mod as ModuleKey)}
                          disabled
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Optional modules */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Optionnel</Badge> Modules supplémentaires
                </h3>
                <div className="grid gap-2">
                  {OPTIONAL_MODULES.map(mod => {
                    const info = MODULE_LABELS[mod] || { fr: mod, desc: '' }
                    const isActive = activeModules.includes(mod as ModuleKey)
                    return (
                      <div key={mod} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{info.fr}</p>
                          <p className="text-xs text-muted-foreground">{info.desc}</p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleModule(mod as ModuleKey)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {message?.tab === 'modules' && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveModules} disabled={savingTab === 'modules'}>
                  {savingTab === 'modules' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Sécurité ────────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" /> Politique de sécurité
              </CardTitle>
              <CardDescription>Configuration du mot de passe, des sessions et de la piste d&apos;audit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password policy */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Politique de mot de passe</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Longueur minimale : {minPasswordLength}</Label>
                    <Slider
                      value={[minPasswordLength]}
                      onValueChange={v => setMinPasswordLength(v[0])}
                      min={6}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Exiger des majuscules</Label>
                    <Switch checked={requireUppercase} onCheckedChange={setRequireUppercase} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Exiger des chiffres</Label>
                    <Switch checked={requireNumbers} onCheckedChange={setRequireNumbers} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Exiger des caractères spéciaux</Label>
                    <Switch checked={requireSpecial} onCheckedChange={setRequireSpecial} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Session */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Sessions</h3>
                <div>
                  <Label className="text-sm">Délai d&apos;expiration de session : {sessionTimeout} minutes</Label>
                  <Slider
                    value={[sessionTimeout]}
                    onValueChange={v => setSessionTimeout(v[0])}
                    min={5}
                    max={120}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Authentification à deux facteurs (2FA)</Label>
                    <p className="text-xs text-muted-foreground">Renforce la sécurité des comptes utilisateurs</p>
                  </div>
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
              </div>

              <Separator />

              {/* Audit trail */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Piste d&apos;audit</h3>
                <div>
                  <Label className="text-sm">Rétention de la piste d&apos;audit : {auditRetention} mois</Label>
                  <Slider
                    value={[auditRetention]}
                    onValueChange={v => setAuditRetention(v[0])}
                    min={6}
                    max={120}
                    step={6}
                    className="mt-2"
                  />
                </div>
              </div>

              {message?.tab === 'security' && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={savingTab === 'security'}>
                  {savingTab === 'security' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Notifications ───────────────────────────────────────────────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" /> Préférences de notification
              </CardTitle>
              <CardDescription>Configurer les alertes automatiques pour les échéances et retards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">CAPA en retard</p>
                  <p className="text-xs text-muted-foreground">Notifier quand une action corrective/préventive dépasse sa date d&apos;échéance</p>
                </div>
                <Switch checked={notifCapaOverdue} onCheckedChange={setNotifCapaOverdue} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Non-conformité en retard</p>
                  <p className="text-xs text-muted-foreground">Notifier quand une NCR reste ouverte au-delà du délai imparti</p>
                </div>
                <Switch checked={notifNcrOverdue} onCheckedChange={setNotifNcrOverdue} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Expiration de document</p>
                  <p className="text-xs text-muted-foreground">Rappeler avant l&apos;expiration des documents à jour</p>
                </div>
                <Switch checked={notifDocExpiry} onCheckedChange={setNotifDocExpiry} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Formation en retard</p>
                  <p className="text-xs text-muted-foreground">Notifier quand une formation obligatoire n&apos;est pas terminée à temps</p>
                </div>
                <Switch checked={notifTrainingOverdue} onCheckedChange={setNotifTrainingOverdue} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Échéance d&apos;audit</p>
                  <p className="text-xs text-muted-foreground">Rappeler les audits à venir et les audits en retard de planification</p>
                </div>
                <Switch checked={notifAuditDue} onCheckedChange={setNotifAuditDue} />
              </div>

              {message?.tab === 'notifications' && (
                <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={savingTab === 'notifications'}>
                  {savingTab === 'notifications' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}