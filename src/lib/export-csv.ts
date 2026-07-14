// ============================================================================
// CSV Export utility — generates and downloads CSV from entity data
// ============================================================================

export function exportToCsv(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(','))

  // Data rows
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return '""'
      const str = String(val)
      // Escape double quotes and wrap in quotes
      return `"${str.replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  // BOM for UTF-8 Excel compatibility
  const bom = '\uFEFF'
  const csvString = bom + csvRows.join('\n')

  // Create blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}