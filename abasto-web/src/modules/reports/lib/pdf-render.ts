import type { PdfReport } from '#/modules/reports/lib/pdf-report'

const margin = 48
const ink = '#2a1d33'
const muted = '#74686a'
const rule = '#ede3d6'
const headFill = '#f6efe6'

/** The built-in PDF fonts only cover Latin-1; swap what falls outside it. */
const latin = (text: string) =>
  text
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .replace(/[\u2212\u2013\u2014]/g, '-')

const numeric = /^[-+$\d]/

/**
 * Draws the report as a letter-size PDF of plain tables and saves it. The PDF
 * libraries load here, on the first download, not with the page.
 */
export async function downloadPdfReport(report: PdfReport) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(ink)
  doc.text(latin(report.heading), margin, margin + 8)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(muted)
  let y = margin + 26
  for (const line of report.lines) {
    doc.text(latin(line), margin, y)
    y += 13
  }
  doc.setDrawColor(rule).line(margin, y, width - margin, y)
  y += 22

  for (const section of report.sections) {
    // Keep a title with at least the start of its table.
    if (y > height - margin - 70) {
      doc.addPage()
      y = margin + 8
    }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(ink)
    doc.text(latin(section.title), margin, y)
    y += 8
    if (section.rows.length === 0) {
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(muted)
      doc.text(latin(section.empty ?? 'Sin datos.'), margin, y + 8)
      y += 30
      continue
    }
    const rows = section.rows.map((row) => row.map(latin))
    const aligns = rows[0].map((_, column) =>
      column > 0 &&
      rows.every((row) => !row[column] || numeric.test(row[column]))
        ? ('right' as const)
        : ('left' as const),
    )
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: margin + 16 },
      head: section.head ? [section.head.map(latin)] : undefined,
      body: rows,
      foot: section.foot ? [section.foot.map(latin)] : undefined,
      showFoot: 'lastPage',
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: ink,
        cellPadding: 4,
        lineColor: rule,
        lineWidth: { bottom: 0.5 },
      },
      headStyles: { fillColor: headFill, textColor: muted, fontStyle: 'bold' },
      footStyles: { fontStyle: 'bold' },
      // Headings and totals follow the alignment of their column.
      didParseCell: ({ cell, column }) => {
        cell.styles.halign = aligns[column.index]
      },
    })
    y =
      (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 12
    if (section.note) {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(muted)
      const lines = doc.splitTextToSize(
        latin(section.note),
        width - margin * 2,
      ) as Array<string>
      doc.text(lines, margin, y)
      y += lines.length * 10
    }
    y += 14
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(muted)
    doc.text(latin(report.footer), margin, height - margin + 14)
    doc.text(
      `Página ${page} de ${pages}`,
      width - margin,
      height - margin + 14,
      {
        align: 'right',
      },
    )
  }
  doc.save(report.filename)
}
