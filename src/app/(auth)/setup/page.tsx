'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheck, Loader2, Check, ArrowLeft, ArrowRight,
  Building2, Stethoscope, Pill, Dna, Microscope, Combine,
  Users, ClipboardCheck, LayoutDashboard, Settings,
} from 'lucide-react'
import { INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, type IndustryType, type ModuleKey } from '@/types/qms'

// ─── Constants ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Organisation', icon: Building2 },
  { id: 2, label: 'Industrie', icon: Stethoscope },
  { id: 3, label: 'Normes', icon: ClipboardCheck },
  { id: 4, label: 'Modules', icon: LayoutDashboard },
  { id: 5, label: 'Équipe', icon: Users },
  { id: 6, label: 'Résumé', icon: Settings },
]

const INDUSTRY_ICONS: Record<IndustryType, any> = {
  medical_device: Stethoscope,
  pharmaceutical: Pill,
  biotech: Dna,
  ivd: Microscope,
  combination_product: Combine,
}

const INDUSTRY_DESCRIPTIONS: Record<IndustryType, string> = {
  medical_device: 'Fabricants de dispositifs médicaux de toutes classes',
  pharmaceutical: 'Laboratoires pharmaceutiques et industries du médicament',
  biotech: 'Entreprises de biotechnologie et produits biologiques',
  ivd: 'Diagnostics in vitro et réactifs de laboratoire',
  combination_product: 'Produits combinés dispositif-médicament',
}

const MODULE_LABELS: Record<string, string> = {
  documents: 'Documents', capa: 'CAPAs', ncr: 'Non-Conformités', audits: 'Audits',
  training: 'Formations', reports: 'Rapports', compliance: 'Conformité',
  risks: 'Risques', hierarchy: 'Hiérarchie', batch_records: 'Dossiers de Lot',
  suppliers: 'Fournisseurs', forms: 'Formulaires', change_control: 'Contrôles Changement',
  deviations: 'Déviations', oos_oot: 'OOS/OOT',
}

const MODULE_DESCS: Record<string, string> = {
  documents: 'Maîtrise des documents et enregistrements',
  capa: 'Actions correctives et préventives',
  ncr: 'Maîtrise du produit non conforme',
  audits: 'Audits internes et externes',
  training: 'Formation et compétence du personnel',
  reports: 'Centre de rapports et analyses',
  compliance: 'Suivi de la conformité réglementaire',
  risks: 'Management des risques (ISO 14971)',
  hierarchy: 'Arborescence documentaire multi-niveaux',
  batch_records: 'Dossiers de lot et traçabilité',
  suppliers: 'Évaluation et gestion des fournisseurs',
  forms: 'Formulaires personnalisables',
  change_control: 'Maîtrise des modifications',
  deviations: 'Déviations planifiées et non planifiées',
  oos_oot: 'Résultats hors spécification',
}

const TEAM_ROLES = [
  { value: 'quality_manager', label: 'Responsable Qualité' },
  { value: 'auditor', label: 'Auditeur' },
  { value: 'document_controller', label: 'Contrôleur Documentaire' },
  { value: 'operator', label: 'Opérateur' },
]

interface TeamMember {
  email: string
  role: string
}

export default function SetupWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [orgSize, setOrgSize] = useState('')

  // Step 2
  const [industry, setIndustry] = useState<IndustryType | ''>('')

  // Step 3
  const [selectedStandards, setSelectedStandards] = useState<string[]>([])

  // Step 4
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([])

  // Step 5
  const [team, setTeam] = useState<TeamMember[]>([{ email: '', role: 'quality_manager' }])

  // Computed
  const availableStandards = industry ? STANDARDS_BY_INDUSTRY[industry] : []
  const recommendedModules = industry ? INDUSTRY_CONFIG[industry]?.recommendedModules || [] : []

  const progressPercent = Math.round((step / STEPS.length) * 100)

  // Initialize standards & modules when industry changes
  const handleIndustryChange = (ind: IndustryType) => {
    setIndustry(ind)
    setSelectedStandards(STANDARDS_BY_INDUSTRY[ind] || [])
    setSelectedModules(INDUSTRY_CONFIG[ind]?.recommendedModules || [])
  }

  // Team management
  const addTeamMember = () => {
    setTeam(prev => [...prev, { email: '', role: 'operator' }])
  }
  const removeTeamMember = (idx: number) => {
    setTeam(prev => prev.filter((_, i) => i !== idx))
  }
  const updateTeamMember = (idx: number, patch: Partial<TeamMember>) => {
    setTeam(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  // Validation
  const validateStep = (): boolean => {
    setError('')
    switch (step) {
      case 1:
        if (!companyName.trim()) { setError('Le nom de l\'entreprise est requis'); return false }
        if (!country.trim()) { setError('Le pays est requis'); return false }
        return true
      case 2:
        if (!industry) { setError('Veuillez sélectionner un type d\'industrie'); return false }
        return true
      case 3:
        if (selectedStandards.length === 0) { setError('Veuillez sélectionner au moins une norme'); return false }
        return true
      case 4:
        if (selectedModules.length === 0) { setError('Veuillez activer au moins un module'); return false }
        return true
      case 5:
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step < STEPS.length) setStep(s => s + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(s => s - 1)
    setError('')
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      await apiPost('/api/organizations/onboard', {
        company_name: companyName,
        country,
        city,
        org_size: orgSize,
        industry_type: industry,
        applicable_standards: selectedStandards,
        active_modules: selectedModules,
        team_invites: team.filter(m => m.email.trim()).map(m => ({ email: m.email, role: m.role })),
      })
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">Configuration initiale</h1>
          <p className="text-sm text-muted-foreground">Configurez votre système de management de la qualité</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Étape {step} sur {STEPS.length} — {progressPercent}%
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                  }`}
                  onClick={() => { if (isDone) { setStep(s.id); setError('') } }}
                  disabled={!isDone && !isActive}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <StepIcon className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 h-px ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* ─── Step 1: Organisation ────────────────────────────────────────── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organisation</CardTitle>
              <CardDescription>Informations de base sur votre entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Nom de l&apos;entreprise *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: MedTech Solutions SARL"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Pays *</Label>
                  <Input
                    className="mt-1"
                    placeholder="Ex: France"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Ville</Label>
                  <Input
                    className="mt-1"
                    placeholder="Ex: Paris"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Taille de l&apos;organisation</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {[
                    { value: '1-10', label: '1-10' },
                    { value: '11-50', label: '11-50' },
                    { value: '51-200', label: '51-200' },
                    { value: '200+', label: '200+' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      variant={orgSize === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => setOrgSize(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: Industrie ───────────────────────────────────────────── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Secteur d&apos;activité</CardTitle>
              <CardDescription>Sélectionnez votre industrie pour adapter les normes et modules recommandés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(INDUSTRY_CONFIG) as [IndustryType, typeof INDUSTRY_CONFIG[IndustryType]][]).map(([key, cfg]) => {
                  const Icon = INDUSTRY_ICONS[key]
                  const isSelected = industry === key
                  return (
                    <button
                      key={key}
                      className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                      }`}
                      onClick={() => handleIndustryChange(key)}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{INDUSTRY_DESCRIPTIONS[key]}</p>
                      <Badge variant="outline" className="mt-2 text-[10px]">{cfg.primaryStandard}</Badge>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 3: Normes ──────────────────────────────────────────────── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Normes applicables</CardTitle>
              <CardDescription>
                Normes recommandées pour {industry ? INDUSTRY_CONFIG[industry]?.label : 'votre industrie'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableStandards.map(std => {
                const isChecked = selectedStandards.includes(std)
                return (
                  <label
                    key={std}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => {
                        setSelectedStandards(prev =>
                          prev.includes(std) ? prev.filter(s => s !== std) : [...prev, std]
                        )
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{std}</p>
                      <p className="text-xs text-muted-foreground">
                        {std.includes('ISO 13485') && 'Système de management de la qualité pour les dispositifs médicaux'}
                        {std.includes('ISO 14971') && 'Management des risques appliqué aux dispositifs médicaux'}
                        {std.includes('ICH Q10') && 'Système de qualité pharmaceutique'}
                        {std.includes('ICH Q7') && 'BPF pour les substances actives'}
                        {std.includes('ICH Q9') && 'Management des risques qualité'}
                        {std.includes('IVDR') && 'Réglementation européenne pour les diagnostics in vitro'}
                        {std.includes('FDA 21 CFR 820') && 'BPF pour les dispositifs médicaux (USA)'}
                        {std.includes('FDA 21 CFR 210') && 'BPF pour les produits pharmaceutiques finis'}
                        {std.includes('FDA 21 CFR 600') && 'Produits biologiques'}
                        {std.includes('FDA 21 CFR 4') && 'Produits combinés'}
                        {std.includes('EU GMP Part I') && 'BPF européennes - Médicaments'}
                        {std.includes('EU GMP Part II') && 'BPF européennes - Substances actives'}
                        {std.includes('ICH Q5') && 'Qualité des produits biotechnologiques'}
                        {std.includes('ISO 9001') && 'Système de management de la qualité'}
                      </p>
                    </div>
                  </label>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* ─── Step 4: Modules ─────────────────────────────────────────────── */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Modules</CardTitle>
              <CardDescription>
                Modules recommandés pour {industry ? INDUSTRY_CONFIG[industry]?.label : 'votre industrie'}.
                Les modules cœur sont activés par défaut.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendedModules.map(mod => {
                const isActive = selectedModules.includes(mod)
                const isCore = (['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'] as const).includes(mod as any)
                return (
                  <div
                    key={mod}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isActive ? 'border-primary/30 bg-primary/5' : 'border-transparent bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => {
                          setSelectedModules(prev =>
                            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
                          )
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{MODULE_LABELS[mod] || mod}</p>
                          {isCore && <Badge variant="secondary" className="text-[10px]">Cœur</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{MODULE_DESCS[mod] || ''}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* ─── Step 5: Équipe ──────────────────────────────────────────────── */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Équipe</CardTitle>
              <CardDescription>Invitez les membres de votre équipe qualité (optionnel)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="flex-1 h-9"
                    placeholder="email@entreprise.com"
                    type="email"
                    value={member.email}
                    onChange={e => updateTeamMember(idx, { email: e.target.value })}
                  />
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm w-40"
                    value={member.role}
                    onChange={e => updateTeamMember(idx, { role: e.target.value })}
                  >
                    {TEAM_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {team.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:text-red-700 shrink-0"
                      onClick={() => removeTeamMember(idx)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTeamMember} className="w-full">
                + Ajouter un membre
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 6: Résumé ──────────────────────────────────────────────── */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé de la configuration</CardTitle>
              <CardDescription>Vérifiez vos sélections avant de lancer la configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organisation */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Organisation
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nom :</span> {companyName}</div>
                  <div><span className="text-muted-foreground">Pays :</span> {country}</div>
                  {city && <div><span className="text-muted-foreground">Ville :</span> {city}</div>}
                  {orgSize && <div><span className="text-muted-foreground">Taille :</span> {orgSize} employés</div>}
                </div>
              </div>

              <Separator />

              {/* Industrie */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Industrie
                </h3>
                <p className="text-sm">
                  {industry ? INDUSTRY_CONFIG[industry]?.label : '—'}
                  {industry && <span className="text-muted-foreground ml-2">({INDUSTRY_CONFIG[industry]?.primaryStandard})</span>}
                </p>
              </div>

              <Separator />

              {/* Normes */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" /> Normes
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStandards.map(std => (
                    <Badge key={std} variant="outline" className="text-xs">{std}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Modules */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Modules actifs ({selectedModules.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModules.map(mod => (
                    <Badge key={mod} variant="secondary" className="text-xs">{MODULE_LABELS[mod] || mod}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Team */}
              {team.some(m => m.email.trim()) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Équipe ({team.filter(m => m.email.trim()).length} membre(s))
                  </h3>
                  <div className="space-y-1">
                    {team.filter(m => m.email.trim()).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span>{m.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {TEAM_ROLES.find(r => r.value === m.role)?.label || m.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={step === 1 ? () => router.push('/dashboard') : handlePrev}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Retour' : 'Précédent'}
          </Button>
          {step < STEPS.length ? (
            <Button onClick={handleNext}>
              Suivant <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Lancer la configuration
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}