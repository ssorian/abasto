import { cn } from '#/lib/utils/cn'

/** The "abarroteros." wordmark; the text color comes from the caller. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-[7px] text-[22px] font-[750] tracking-[-1.1px] whitespace-nowrap',
        className,
      )}
    >
      <span className="relative flex w-[26px] items-center text-[35px] leading-[35px] font-black tracking-[-3px] text-primary">
        a<span className="absolute right-0 -bottom-[3px] text-[30px]">•</span>
      </span>
      <span>
        abarroteros<span className="text-primary">.</span>
      </span>
    </span>
  )
}
