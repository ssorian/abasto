export const reportSections = [
  { id: 'reporte-ventas', label: 'Ventas' },
  { id: 'reporte-proveedores', label: 'Proveedores' },
  { id: 'reporte-inventario', label: 'Inventario' },
  { id: 'reporte-caja', label: 'Caja y repartos' },
] as const

/** Short index of the long report: each link jumps to that part of the page. */
export function SectionIndex() {
  return (
    <nav aria-label="Secciones del reporte" className="mb-[18px] flex gap-2">
      {reportSections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="rounded-full border border-[#e6dfeb] bg-white px-4 py-1.5 text-[13px] font-semibold text-[#5d387e] hover:bg-[#f7f1ea]"
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
