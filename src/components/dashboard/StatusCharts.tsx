'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// Color palette for status badges
const STATUS_COLORS: Record<string, string> = {
  'Open': '#ef4444',
  'Under Investigation': '#f59e0b',
  'Investigation': '#f59e0b',
  'Pending Disposition': '#f59e0b',
  'Pending QA Review': '#f59e0b',
  'Implementation': '#3b82f6',
  'In Progress': '#3b82f6',
  'Effectiveness Check': '#8b5cf6',
  'Closed': '#22c55e',
  'Completed': '#22c55e',
  'Approved': '#22c55e',
  'Effective': '#22c55e',
  'Released': '#22c55e',
  'Qualified': '#22c55e',
  'Draft': '#94a3b8',
  'Under Review': '#f59e0b',
  'Planned': '#94a3b8',
  'Requested': '#94a3b8',
  'Active': '#3b82f6',
  'Disqualified': '#ef4444',
  'Rejected': '#ef4444',
  'Obsolete': '#ef4444',
  'Mitigated': '#3b82f6',
  'Accepted': '#3b82f6',
  'Conditional': '#f59e0b',
}

function getColor(status: string): string {
  return STATUS_COLORS[status] || '#94a3b8'
}

interface PieChartCardProps {
  title: string
  data: { status: string; count: number }[]
  loading?: boolean
}

export function StatusPieChart({ title, data, loading }: PieChartCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={getColor(entry.status)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface BarChartCardProps {
  title: string
  data: { name: string; value: number }[]
  loading?: boolean
  color?: string
}

export function StatusBarChart({ title, data, loading, color = '#3b82f6' }: BarChartCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [value, 'Nombre']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={entry.name} fill={getColor(entry.name) || color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Compliance score gauge (SVG donut)
interface ComplianceGaugeProps {
  score: number
  label?: string
  loading?: boolean
}

export function ComplianceGauge({ score, label = 'Score de conformité', loading }: ComplianceGaugeProps) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  const textColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const strokeDasharray = `${score * 3.14} 314`

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke={color}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={strokeDasharray}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${textColor}`}>{score}%</span>
              <span className="text-xs text-muted-foreground">Conformité</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{label}</h3>
            <p className="text-sm text-muted-foreground">
              Score global de conformité ISO 13485
            </p>
            <div className="flex gap-4 mt-3">
              {score >= 80 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Conforme
                </span>
              )}
              {score >= 60 && score < 80 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  Amélioration requise
                </span>
              )}
              {score < 60 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  Non conforme
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}