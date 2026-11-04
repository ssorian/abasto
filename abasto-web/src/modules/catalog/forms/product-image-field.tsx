import { PackageIcon } from 'lucide-react'

import { Field } from '#/modules/catalog/forms/form-field'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 300_000

type ProductImageFieldProps = {
  image: string
  onChange: (image: string) => void
  onError: (message: string) => void
}

/** Image preview plus file picker; the file is kept as a data URL. */
export function ProductImageField({
  image,
  onChange,
  onError,
}: ProductImageFieldProps) {
  const pick = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      onError('Selecciona una imagen PNG, JPG o WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      onError('Usa una imagen de hasta 300 KB para conservarla con la demo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange(String(reader.result))
      onError('')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-[#f5f8fc] p-3 md:gap-5 md:p-4">
      {image ? (
        <img
          src={image}
          alt="Imagen del producto"
          className="h-[85px] w-[75px] object-contain"
        />
      ) : (
        <PackageIcon
          size={40}
          strokeWidth={2}
          className="min-w-[75px] text-[#627e9f]"
        />
      )}
      <Field label="Imagen del producto" className="min-w-0 flex-1">
        <input
          aria-label="Imagen del producto"
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={(event) => pick(event.target.files?.[0])}
          className="min-h-[43px] w-full min-w-0 rounded-lg border border-[#dce4ed] bg-white p-2 text-[11px] font-normal text-[#223751]"
        />
        <small className="text-[11px] font-normal text-[#8290a2]">
          PNG, JPG o WebP · Hasta 300 KB
        </small>
      </Field>
    </div>
  )
}
