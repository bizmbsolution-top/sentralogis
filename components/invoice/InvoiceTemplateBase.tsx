import { type InvoiceTemplateBaseProps, type InvoiceTheme } from '@/types/invoice'
import MinimalBlackWhite from './templates/MinimalBlackWhite'
import ModernCorporate from './templates/ModernCorporate'
import LightBrand from './templates/LightBrand'

const templateMap: Record<InvoiceTheme, React.FC<InvoiceTemplateBaseProps>> = {
  blackWhite: MinimalBlackWhite,
  corporate: ModernCorporate,
  lightBrand: LightBrand,
}

export default function InvoiceTemplateBase(props: InvoiceTemplateBaseProps) {
  const theme: InvoiceTheme = props.theme ?? 'blackWhite'
  const Template = templateMap[theme]

  return <Template {...props} />
}
