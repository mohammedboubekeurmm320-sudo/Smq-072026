'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

interface ScoreDimension {
  label: string
  score: number // 0-100
  weight: number // percentage
}

interface SupplierScorecardProps {
  qualityScore?: number
  deliveryScore?: number
  priceScore?: number
  responsivenessScore?: number
  overallScore?: number
  qualificationStatus?: string
  lastAuditDate?: string
  className?: string
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 dark:text-green-400'
  if (score >= 60) return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}

function scoreBarColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-green-500'
  if (score >= 60) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-950'
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-950'
  return 'bg-red-100 dark:bg-red-950'
}

export function SupplierScorecard({
  qualityScore = 0,
  deliveryScore = 0,
  priceScore = 0,
  responsivenessScore = 0,
  overallScore,
  qualificationStatus,
  lastAuditDate,
  className = '',
}: SupplierScorecardProps) {
  const computed = overallScore ?? Math.round(
    (qualityScore * 0.4 + deliveryScore * 0.3 + priceScore * 0.15 + responsivenessScore * 0.15)
  )

  const dimensions: ScoreDimension[] = [
    { label: 'Qualité', score: qualityScore, weight: 40 },
    { label: 'Livraison', score: deliveryScore, weight: 30 },
    { label: 'Prix', score: priceScore, weight: 15 },
    { label: 'Réactivité', score: responsivenessScore, weight: 15 },
  ]

  const statusMap: Record<string, { label: string; style: string }> = {
    qualified: { label: 'Qualifié', style: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
    conditional: { label: 'Conditionnel', style: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400' },
    probation: { label: 'En probation', style: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
    disapproved: { label: 'Non approuvé', style: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
    new: { label: 'Nouveau', style: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
  }

  const statusInfo = statusMap[(qualificationStatus || '').toLowerCase()] || statusMap.new

  return (
    <div className={className}>
      {/* Overall score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center ${scoreBgColor(computed)} ${scoreColor(computed)}`}>
          <span className="text-2xl font-bold leading-none">{computed}</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">/ 100</span>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Score global</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`border text-xs ${statusInfo.style}`}>
              {statusInfo.label}
            </Badge>
            {lastAuditDate && (
              <span className="text-[10px] text-muted-foreground">
                Dernier audit : {new Date(lastAuditDate).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        {dimensions.map(dim => (
          <div key={dim.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">{dim.label}</Label>
                <span className="text-[9px] text-muted-foreground">({dim.weight}%)</span>
              </div>
              <span className={`text-xs font-bold ${scoreColor(dim.score)}`}>{dim.score}</span>
            </div>
            <Progress value={dim.score} className={`h-1.5 ${scoreBarColor(dim.score)}`} />
          </div>
        ))}
      </div>

      {/* Performance legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>≥ 80 Excellent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>60-79 Acceptable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>&lt; 60 Insuffisant</span>
        </div>
      </div>
    </div>
  )
}