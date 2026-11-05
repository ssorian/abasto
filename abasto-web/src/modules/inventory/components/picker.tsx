import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils/cn'

export type PickerOption = string | { value: string; label: string }

type PickerProps = {
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<PickerOption>
  /** Accessible name of the trigger. */
  label: string
  className?: string
  placeholder?: string
}

/** Reference `Picker`: shadcn select with a 43px white trigger. */
export function Picker({
  value,
  onChange,
  options,
  label,
  className,
  placeholder,
}: PickerProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'max-w-full data-[size=default]:h-[43px] rounded-[8px] border-[#e7e0e2] bg-white px-[13px] text-sm text-[#59464c] shadow-none',
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value
          return (
            <SelectItem key={optionValue} value={optionValue}>
              {typeof option === 'string' ? option : option.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
