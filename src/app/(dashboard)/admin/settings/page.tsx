'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Save, Loader2, Building2, Settings, ShieldCheck } from 'lucide-react'
import { INDUSTRY_CONFIG, type IndustryType } from '@/types/qms'

export default function AdminSettingsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [orgSize, setOrgSize] = useState('')
  const [industryType, setIndustryType] = useState<IndustryType>('medical_device')
  const [applicableStandards, setApplicableStandards] = useState<string[]>([])

  useEffect(() => {
    if (!profile?.organizationId) return
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
          if (org.applicable_standards) setApplicableStandards(
            Array.isArray(org.applicable_standards) ? org.applicable_standards : org.applicable_standards.split(',')
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile?.organizationId])

  const handleSave = async () => {
    if (!profile?.organizationId) return
    setSaving(true)
    setMessage('')
    try {
      await apiPut(`/api/organizations/${profile.organizationId}`, {
        name: companyName,
        country,
        city,
        org_size: orgSize,
        industry_type: industryType,
        applicable_standards: applicableStandards,
      })
      setMessage('Paramètres sauvegardés avec succès')
    } catch (err: any) {
      setMessage(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const currentConfig = INDUSTRY_CONFIG[industryType]
  const availableStandards = currentConfig
    ? currentConfig.primaryStandard.split(' + ')
    : ['ISO 13485:2016']

  const toggleStandard = (std: string) => {
    setApplicableStandards(prev =>
      prev.includes(std) ? prev.filter(s => s !== std) : [...prev, std]
    )
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuration de l&apos;organisation et des normes applicables
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Nom de l&apos;entreprise</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="mt-1" placeholder="Nom de l'organisation" />
            </div>
            <div>
              <Label className="text-sm">Taille</Label>
              <Select value={orgSize} onValueChange={setOrgSize}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employés</SelectItem>
                  <SelectItem value="11-50">11-50 employés</SelectItem>
                  <SelectItem value="51-200">51-200 employés</SelectItem>
                  <SelectItem value="201-1000">201-1000 employés</SelectItem>
                  <SelectItem value="1000+">1000+ employés</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Industry & Standards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Réglementation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Type d&apos;industrie</Label>
            <Select value={industryType} onValueChange={v => {
              setIndustryType(v as IndustryType)
              const cfg = INDUSTRY_CONFIG[v as IndustryType]
              if (cfg) setApplicableStandards(cfg.primaryStandard.split(' + '))
            }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INDUSTRY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label} — {cfg.primaryStandard}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Normes applicables</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableStandards.map(std => (
                <Badge
                  key={std}
                  variant={applicableStandards.includes(std) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStandard(std)}
                >
                  {std}
                </Badge>
              ))}
            </div>
          </div>

          {currentConfig && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Modules recommandés</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentConfig.recommendedModules.map(mod => (
                    <Badge key={mod} variant="secondary" className="text-xs">{mod}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
        {message && (
          <span className={`text-sm ${message.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}