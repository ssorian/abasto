import { View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { ProductIcon, type ProductIconName } from './product-chrome';

const card = 'mb-4 mx-4 rounded-xl bg-white p-4 shadow-sm';

export function ProductPricing() {
  return <View className={card}><View className="flex-row items-start justify-between"><View><Text className="text-[11px] font-bold leading-[14px] uppercase tracking-wider text-text-muted">Precio por Caja (24 Pzas)</Text><View className="mt-0.5 flex-row items-baseline gap-2"><Text variant="display" className="text-[22px] font-extrabold leading-[26px] text-red-institutional">$412.80</Text><Text className="text-[12px] leading-4 text-text-muted line-through">$434.50</Text><Text className="rounded bg-stock-green-bg px-1.5 py-0.5 text-[11px] font-bold leading-[14px] text-stock-green">-5%</Text></View></View><View className="items-end"><Text className="text-[11px] font-bold leading-[14px] uppercase tracking-wider text-text-muted">Costo Unitario</Text><Text variant="display" className="mt-0.5 text-[18px] font-semibold leading-6 text-text-carbon">$17.20 <Text className="text-[11px] font-normal text-text-muted">/ pza</Text></Text></View></View>
    <View className="mt-2 gap-2 rounded-lg bg-surface-container-low p-3"><View className="flex-row items-center justify-between gap-2"><View className="min-w-0 flex-1 flex-row items-center gap-1"><ProductIcon name="store" size={16} color="#66717A" /><Text className="min-w-0 flex-1 text-[12px] leading-5 text-text-muted">Precio Sugerido al Mostrador</Text></View><Text className="min-w-0 flex-1 text-right text-[14px] font-bold leading-5 text-text-carbon">$21.00 – $22.00 / pza</Text></View><View className="h-px bg-surface-container-highest" /><View className="flex-row items-center justify-between gap-2"><View className="min-w-0 flex-1 flex-row items-center gap-1.5"><ProductIcon name="payments" size={20} color="#2E7D4F" /><View className="min-w-0 flex-1"><Text className="text-[11px] font-bold leading-[14px] uppercase tracking-wider text-stock-green">Tu Margen Estimado: 22%</Text><Text className="text-[12px] leading-4 text-text-carbon">+$4.80 por botella vendida</Text></View></View><View className="w-[94px] shrink-0 rounded-md bg-stock-green-bg px-2.5 py-1"><Text className="text-right text-[12px] font-bold leading-4 text-stock-green">+$115.20</Text><Text className="text-right text-[12px] leading-4 text-stock-green">ganancia x caja</Text></View></View></View>
  </View>;
}

const tiers = [
  { range: '1-2', label: '1 a 2 Cajas', net: '$17.20 neto por pieza', price: '$412.80 c/u', detail: 'Precio Base' },
  { range: '3-5', label: '3 a 5 Cajas', net: '$16.58 neto por pieza', price: '$398.00 c/u', detail: '+$130.08 margen x caja' },
  { range: '6+', label: '6 o más Cajas', net: '$16.04 neto por pieza', price: '$385.00 c/u', detail: 'Tarima / Camión' },
];
export function ProductVolumeTiers() {
  return <View className={card}>
    <View className="mb-3 flex-row items-center justify-between">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <ProductIcon name="tiers" color="#B92B27" size={22} />
        <Text variant="display" className="min-w-0 flex-1 text-[18px] font-semibold leading-6 text-text-carbon">Escala de Descuento por Volumen</Text>
      </View>
      <Text className="w-[74px] text-[11px] font-bold leading-[14px] text-text-muted">Mayoreo Directo</Text>
    </View>
    <View className="gap-2.5">{tiers.map((tier, index) => <View key={tier.range} className="rounded-lg bg-surface-container-low p-3">
      {index === 1 && <View className="mb-1.5 flex-row justify-between gap-1"><View className="flex-row items-center gap-1 rounded-full bg-maize-gold px-2 py-0.5"><ProductIcon name="star" size={13} /><Text className="text-[11px] font-bold">Recomendado para fin de semana</Text></View><Text className="rounded bg-[#C83E3E1A] px-2 py-0.5 text-[11px] font-bold text-red-warm">Ahorra 8%</Text></View>}
      <View className="flex-row items-center justify-between gap-2">
        <View style={{ flex: index === 2 ? 1 : 1.7 }} className="min-w-0 flex-row items-center gap-3">
          <View className={`h-7 w-7 shrink-0 items-center justify-center rounded-full ${index === 1 ? 'bg-red-institutional' : 'bg-surface-container-highest'}`}><Text className={`text-[11px] font-bold ${index === 1 ? 'text-white' : 'text-text-carbon'}`}>{tier.range}</Text></View>
          <View className="min-w-0 flex-1"><Text className="text-[12px] font-bold leading-4 text-text-carbon">{tier.label}</Text><Text className={`text-[12px] leading-4 ${index ? 'font-semibold text-stock-green' : 'text-text-muted'}`}>{tier.net}</Text></View>
        </View>
        <View className="min-w-0 flex-1 items-end">
          <View className="min-w-0 flex-row items-center justify-end gap-1">{index === 2 && <Text className="shrink-0 rounded bg-stock-green-bg px-1.5 py-0.5 text-[11px] font-bold text-stock-green">Ahorra 12%</Text>}<Text className={`min-w-0 text-right text-[14px] font-bold leading-5 ${index === 1 ? 'text-red-institutional' : 'text-text-carbon'}`}>{tier.price}</Text></View>
          <Text className={`text-right text-[11px] font-bold ${index === 1 ? 'text-stock-green' : 'text-text-muted'}`}>{tier.detail}</Text>
        </View>
      </View>
    </View>)}</View>
  </View>;
}

const units = [
  { label: 'Caja Mayorista', quantity: '× 24 botellas', price: '$412.80' },
  { label: 'Media Caja', quantity: '× 12 botellas', price: '$216.00' },
  { label: 'Tarima Completa', quantity: '× 60 cajas', price: '$23,100' },
];
export function ProductUnits() {
  return <View className={card}><Text variant="display" className="mb-2 text-[18px] font-semibold text-text-carbon">Unidad de Compra</Text><View className="flex-row gap-2">{units.map((unit, index) => <View key={unit.label} className={`min-w-0 flex-1 items-center justify-center rounded-lg p-2.5 ${index === 0 ? 'bg-red-institutional' : 'bg-surface-container-low opacity-70'}`}><Text className={`text-center text-[12px] font-bold uppercase ${index === 0 ? 'text-white' : 'text-text-carbon'}`}>{unit.label}</Text><Text className={`text-center text-[11px] font-medium ${index === 0 ? 'text-white' : 'text-text-muted'}`}>{unit.quantity}</Text><Text className={`mt-1 text-[12px] font-semibold ${index === 0 ? 'text-[#FFDF95]' : 'text-text-muted'}`}>{unit.price}</Text></View>)}</View></View>;
}

const specs: { icon: ProductIconName; title: string; description: string; green?: boolean }[] = [
  { icon: 'box', title: 'Presentación de Fábrica', description: 'Caja de cartón reforzado flejada con 24 botellas PET de 600 ml cada una.' },
  { icon: 'scale', title: 'Peso de Maniobra', description: '~15.5 kg por caja flejada. Bulto estibable máximo a 5 camas en mostrador.' },
  { icon: 'calendar', title: 'Caducidad Fresca Garantizada', description: 'Mínimo 6 meses de vigencia activa al momento de la entrega en tienda.' },
  { icon: 'barcode', title: 'Códigos de Lectura Rápida', description: 'Botella individual: 7501055300075 | DUN-14 Caja: 17501055300072' },
  { icon: 'schedule', title: 'Ventana de Despacho Abarroteros', description: 'Entrega al día siguiente en ruta matutina consolidada (8:00 AM – 1:00 PM).', green: true },
];
export function ProductLogistics() {
  return <><View className={card}><View className="mb-3 flex-row items-center gap-2"><ProductIcon name="delivery" color="#960e12" size={22} /><Text variant="display" className="flex-1 text-[18px] font-semibold text-text-carbon">Especificaciones de Carga & Bodega</Text></View><View className="gap-3">{specs.map(spec => <View key={spec.title} className="flex-row items-start gap-3"><View className="h-8 w-8 items-center justify-center rounded-lg bg-surface-container"><ProductIcon name={spec.icon} size={18} color={spec.green ? '#2E7D4F' : '#20252B'} /></View><View className="min-w-0 flex-1"><Text className="text-[12px] font-bold text-text-carbon">{spec.title}</Text><Text className={`text-[12px] leading-[18px] ${spec.green ? 'font-medium text-stock-green' : 'text-text-muted'}`}>{spec.description}</Text></View></View>)}</View></View><View className="mb-6 flex-row gap-2 px-4">{[{ icon: 'return' as const, title: 'Cambio por Merma', detail: 'Garantía por rotura', color: '#B92B27' }, { icon: 'receipt' as const, title: 'Factura CFDI 4.0', detail: 'Descarga automática', color: '#7D5D00' }].map(item => <View key={item.title} className="min-w-0 flex-1 flex-row items-center gap-2 rounded-lg bg-surface-container-low p-3"><ProductIcon name={item.icon} color={item.color} /><View className="min-w-0"><Text className="text-[11px] font-bold text-text-carbon">{item.title}</Text><Text className="text-[11px] text-text-muted">{item.detail}</Text></View></View>)}</View></>;
}
