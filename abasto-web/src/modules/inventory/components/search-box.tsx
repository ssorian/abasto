import { SearchIcon, XIcon } from 'lucide-react'

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
}

/** Search field with a clear button. */
export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
}: SearchBoxProps) {
  return (
    <div className="flex h-[45px] min-w-0 flex-[1_0_100%] items-center gap-2.5 rounded-[9px] border border-[#e0e6ee] bg-white px-[13px] text-[#8190a2] focus-within:border-[#91a8c3] md:h-11 md:flex-1">
      <SearchIcon size={19} className="shrink-0" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full min-w-0 bg-transparent text-xs text-[#344e6e] outline-none placeholder:text-[#8a97a8] wide:text-sm"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange('')}
        >
          <XIcon size={16} />
        </button>
      )}
    </div>
  )
}
