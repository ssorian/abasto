import { ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { filterProducts } from '#/lib/product-search'
import { cn } from '#/lib/utils/cn'

export type PickerProduct = { id: string; name: string; sku: string }

type ProductPickerProps = {
  products: ReadonlyArray<PickerProduct>
  /** Selected product id, or '' for none. */
  value: string
  onChange: (productId: string) => void
  /** Accessible name of the field. */
  label: string
  disabled?: boolean
  /** Hint shown while nothing is chosen; defaults to product search. */
  placeholder?: string
}

/** Searchable product combobox: type to filter by name or SKU, arrows + Enter to choose. */
export function ProductPicker({
  products,
  value,
  onChange,
  label,
  disabled,
  placeholder = 'Busca por nombre o SKU',
}: ProductPickerProps) {
  const listId = useId()
  const selected = products.find(({ id }) => id === value)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const matches = filterProducts(products, query)

  function choose(product: PickerProduct) {
    onChange(product.id)
    setQuery('')
    setOpen(false)
  }

  function close() {
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative min-w-0">
      <div className="flex min-h-[43px] items-center gap-2 rounded-[8px] border border-[#e8e1e3] bg-white px-3 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#d8c0e9]">
        <SearchIcon size={16} className="shrink-0 text-[#9b888e]" />
        <input
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active] ? `${listId}-${active}` : undefined
          }
          disabled={disabled}
          autoComplete="off"
          placeholder={selected ? selected.name : placeholder}
          value={open ? query : (selected?.name ?? '')}
          className="h-full min-h-[41px] w-full min-w-0 bg-transparent text-sm text-[#3b2251] outline-none placeholder:text-[#a29096]"
          onFocus={() => setOpen(true)}
          onBlur={close}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            const pressed = event.code
            if (pressed === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActive((index) => Math.min(index + 1, matches.length - 1))
            } else if (pressed === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(index - 1, 0))
            } else if (
              (pressed === 'Enter' || pressed === 'NumpadEnter') &&
              open
            ) {
              // Never submit the surrounding form while choosing.
              event.preventDefault()
              if (matches[active]) choose(matches[active])
            } else if (pressed === 'Escape' && open) {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
          }}
        />
        <ChevronsUpDownIcon size={16} className="shrink-0 text-[#9b888e]" />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-[8px] border border-[#e8e1e3] bg-white py-1 shadow-lg"
        >
          {matches.length ? (
            matches.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={product.id === value}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm text-[#3b2251]',
                  index === active && 'bg-[#f4eef8]',
                )}
                onMouseEnter={() => setActive(index)}
                // mousedown fires before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(product)
                }}
              >
                <strong className="font-medium">{product.name}</strong>
                {product.sku && (
                  <small className="block text-[#907e84]">{product.sku}</small>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-[#907e84]">
              Sin resultados. Prueba con otro nombre o SKU.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
