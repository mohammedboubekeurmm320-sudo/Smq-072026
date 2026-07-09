'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, CORE_MODULES, OPTIONAL_MODULES, type IndustryType, type ModuleKey } from '@/types/qms'
import { ShieldCheck, Building2, Layers, Users, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'

const STEPS = ['organization', 'industry', 'standards', 'modules', 'team', 'summary'] as const

export function SetupWizard() {
  const { organization, profile, updateOrgSettings } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    orgName: organization?.name || '',
    country: '', city: '', orgSize: '',
    industry: organization?.settings.industry_type || 'medical_device' as IndustryType,
    selectedStandards: STANDARDS_BY_INDUSTRY[organization?.settings.industry_type || 'medical_device'] || [],
    activeModules: organization?.settings.active_modules || [...CORE_MODULES] as ModuleKey[],
    teamMembers: [] as { email: string; role: string }[],
  })

  const industryConfig = INDUSTRY_CONFIG[form.industry]
  const recommendedModules = industryConfig.recommendedModules

  const handleToggleModule = (m: ModuleKey) => {
    if (CORE_MODULES.includes(m as any)) return  // cannot uncheck core
    setForm(f => ({
      ...f,
      activeModules: f.activeModules.includes(m)
        ? f.activeModules.filter(x => x !== m)
        : [...f.activeModules, m],
    }))
  }

  const handleSelectIndustry = (i: IndustryType) => {
    setForm(f => ({
      ...f,
      industry: i,
      selectedStandards: STANDARDS_BY_INDUSTRY[i],
      activeModules: [...INDUSTRY_CONFIG[i].recommendedModules],
    }))
  }

  const canNext = () => {
    if (step === 0) return form.orgName.trim().length > 0
    if (step === 1) return !!form.industry
    if (step === 2) return form.selectedStandards.length > 0
    if (step === 3) return form.activeModules.length > 0
    return true
  }

  const handleLaunch = () => {
    updateOrgSettings({
      setup_completed: true,
      industry_type: form.industry,
      applicable_standards: form.selectedStandards,
      active_modules: form.activeModules,
      company_name: form.orgName,
      country: form.country,
      city: form.city,
      org_size: form.orgSize,
      notifications: { capa_overdue: true, ncr_overdue: true, document_expiry: true, training_overdue: true, audit_due: true },
    })
    toast({ title: 'Configuration terminée !', description: 'Votre système QMS est prêt.' })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
        <div>
          <div className="font-bold">Configuration initiale du QMS</div>
          <div className="text-xs text-muted-foreground">Bienvenue, {profile?.fullName}</div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {STEPS.map((s, i) => (
                  <div key={s} className={`h-2 w-12 rounded-full ${i <= step ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                ))}
              </div>
              <Badge variant="outline">Étape {step + 1} / {STEPS.length}</Badge>
            </div>
            <CardTitle className="flex items-center gap-2">
              {step === 0 && <><Building2 className="h-5 w-5" /> Organisation</>}
              {step === 1 && <><Layers className="h-5 w-5" /> Industrie</>}
              {step === 2 && <><ShieldCheck className="h-5 w-5" /> Normes applicables</>}
              {step === 3 && <><Layers className="h-5 w-5" /> Modules QMS</>}
              {step === 4 && <><Users className="h-5 w-5" /> Équipe (optionnel)</>}
              {step === 5 && <><CheckCircle2 className="h-5 w-5" /> Résumé</>}
            </CardTitle>
            <CardDescription>
              {step === 0 && 'Informations sur votre organisation'}
              {step === 1 && 'Sélectionnez votre secteur d\'activité'}
              {step === 2 && 'Normes de référence à appliquer'}
              {step === 3 && 'Modules QMS à activer (Core requis)'}
              {step === 4 && 'Invitez votre équipe (peut être fait plus tard)'}
              {step === 5 && 'Vérifiez et lancez votre système'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="grid gap-3">
                <div><Label>Nom de l'organisation *</Label><Input value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                </div>
                <div><Label>Taille de l'organisation</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background text-sm" value={form.orgSize} onChange={e => setForm({ ...form, orgSize: e.target.value })}>
                    <option value="">—</option>
                    <option value="1-10">1-10 employés</option>
                    <option value="11-50">11-50 employés</option>
                    <option value="50-200">50-200 employés</option>
                    <option value="200-1000">200-1000 employés</option>
                    <option value="1000+">1000+ employés</option>
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(INDUSTRY_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => handleSelectIndustry(k as IndustryType)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${form.industry === k ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{v.primaryStandard}</div>
                    <div className="text-xs text-muted-foreground mt-1">{v.recommendedModules.length} modules recommandés</div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-2">
                {STANDARDS_BY_INDUSTRY[form.industry].map(s => (
                  <label key={s} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <Checkbox checked={form.selectedStandards.includes(s)} onCheckedChange={(c) => {
                      setForm(f => ({
                        ...f,
                        selectedStandards: c ? [...f.selectedStandards, s] : f.selectedStandards.filter(x => x !== s),
                      }))
                    }} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground mt-2">Normes recommandées pour {industryConfig.label}. Vous pouvez ajouter d'autres normes plus tard dans les Paramètres.</p>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3">
                <div>
                  <div className="text-sm font-medium mb-2">Modules Core (obligatoires)</div>
                  <div className="grid grid-cols-2 gap-2">
                    {CORE_MODULES.map(m => (
                      <label key={m} className="flex items-center gap-2 p-2 border rounded bg-slate-50 opacity-90">
                        <Checkbox checked disabled />
                        <span className="text-sm">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Modules optionnels</div>
                  <div className="grid grid-cols-2 gap-2">
                    {OPTIONAL_MODULES.map(m => (
                      <label key={m} className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50 ${recommendedModules.includes(m) ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                        <Checkbox checked={form.activeModules.includes(m)} onCheckedChange={() => handleToggleModule(m)} />
                        <span className="text-sm">{m}{recommendedModules.includes(m) && <Badge variant="outline" className="ml-1 text-xs">Recommandé</Badge>}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">Vous pouvez inviter des membres d'équipe maintenant ou plus tard.</p>
                {form.teamMembers.map((m, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <Input placeholder="email@entreprise.fr" value={m.email} onChange={e => {
                      const arr = [...form.teamMembers]; arr[i] = { ...arr[i], email: e.target.value }
                      setForm({ ...form, teamMembers: arr })
                    }} />
                    <select className="px-3 py-2 border rounded-md bg-background text-sm" value={m.role} onChange={e => {
                      const arr = [...form.teamMembers]; arr[i] = { ...arr[i], role: e.target.value }
                      setForm({ ...form, teamMembers: arr })
                    }}>
                      <option value="quality_manager">Responsable Qualité</option>
                      <option value="document_controller">Contrôleur Documentaire</option>
                      <option value="auditor">Auditeur</option>
                      <option value="operator">Opérateur</option>
                      <option value="executive">Direction</option>
                    </select>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, teamMembers: [...form.teamMembers, { email: '', role: 'quality_manager' }] })}>
                  <Users className="h-4 w-4 mr-2" /> Ajouter un membre
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-2 text-sm">
                <div><span className="text-muted-foreground">Organisation:</span> {form.orgName}</div>
                <div><span className="text-muted-foreground">Industrie:</span> {industryConfig.label}</div>
                <div><span className="text-muted-foreground">Standard primaire:</span> {industryConfig.primaryStandard}</div>
                <div><span className="text-muted-foreground">Normes applicables:</span> {form.selectedStandards.join(', ')}</div>
                <div><span className="text-muted-foreground">Modules activés:</span> {form.activeModules.length} ({form.activeModules.join(', ')})</div>
                <div><span className="text-muted-foreground">Membres d'équipe:</span> {form.teamMembers.filter(m => m.email).length}</div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canNext()} onClick={() => setStep(step + 1)}>
                  Suivant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleLaunch}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Lancer le système
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
