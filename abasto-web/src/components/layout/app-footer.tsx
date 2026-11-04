export function AppFooter() {
  return (
    <footer className="mt-[18px] flex items-center gap-2.5 border-t border-footer-border p-5 text-footer md:gap-[13px] md:px-[38px] md:py-[19px]">
      <span className="text-xs font-[750] tracking-[-0.6px] text-footer-brand">
        abarroteros<span className="ml-0.5 text-footer-dot">▪</span>
      </span>
      <small className="hidden text-xs md:inline">
        Tu almacén, bajo control.
      </small>
      <small className="ml-auto text-xs">
        Datos de ejemplo · Guardado local
      </small>
    </footer>
  )
}
