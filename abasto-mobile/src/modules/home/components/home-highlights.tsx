import { Pressable, TextInput, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './home-chrome';

export function SearchAndStatus({ onBarcode }: { onBarcode: () => void }) {
  return <View className="gap-4 px-4 pb-2 pt-3">
    <View className="h-14 flex-row items-center gap-2 rounded-xl bg-white p-1.5 pl-4"><Icon name="search" color="#66717A" /><TextInput placeholder="Buscar productos, marcas o categorías" placeholderTextColor="#66717A" className="flex-1 text-home-sm text-text-carbon" /><Pressable onPress={onBarcode} accessibilityLabel="Escanear código de barras (vista de demostración)" className="h-11 w-11 items-center justify-center rounded-lg bg-surface-container"><Icon name="barcode" color="#20252B" size={24} /></Pressable></View>
    <View className="flex-row items-center gap-3 rounded-xl bg-stock-green-bg p-3.5"><View className="h-10 w-10 items-center justify-center rounded-lg bg-[#1e7043]"><Icon name="delivery" color="white" size={22} /></View><View className="min-w-0 flex-1"><View className="flex-row items-center gap-1"><View className="h-2 w-2 shrink-0 rounded-full bg-stock-green" /><Text numberOfLines={1} className="min-w-0 flex-1 text-[12px] font-bold text-stock-green">Pedido en camino · #ABR-18342</Text></View><Text numberOfLines={1} className="mt-0.5 text-home-xs font-semibold text-text-carbon">Entrega estimada hoy: 11:30 - 13:00 hrs</Text></View><Pressable accessibilityLabel="Rastrear pedido (vista de demostración)" className="flex-row items-center justify-center rounded-lg bg-white px-3 py-1.5"><Text className="text-home-xs font-bold text-primary">Rastrear</Text><Text className="text-primary"> ›</Text></Pressable></View>
  </View>;
}

export function Promotion() {
  return <View className="mx-4 mt-1 overflow-hidden rounded-xl">
    <LinearGradient colors={['#B92B27', '#960e12', '#b92b27']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ padding: 16, overflow: 'hidden' }}>
      <View pointerEvents="none" className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-maize-gold/15" />
      <View pointerEvents="none" className="absolute -top-8 right-14 h-20 w-20 rounded-full bg-white/10" />
      <View className="flex-row items-start justify-between gap-2">
        <View className="w-[70%] flex-shrink">
          <View className="mb-1 self-start flex-row items-center gap-1 rounded-full bg-maize-gold px-2 py-0.5"><Icon name="bolt" size={13} /><Text className="text-[11px] font-extrabold uppercase tracking-wide text-text-carbon">Mayoreo Express</Text></View>
          <Text variant="display" className="mt-0.5 text-[18px] font-bold leading-6 text-white">Semana de Bebidas</Text>
          <Text className="mt-1 text-[12px] leading-4 text-[#ffd5d0]">Hasta <Text className="font-bold text-[#ffce4b]">10% de margen extra</Text> en charolas y cajas completas.</Text>
        </View>
        <Pressable accessibilityLabel="Ver ofertas (vista de demostración)" className="mt-1 rounded-lg bg-maize-gold px-3 py-2"><Text className="text-[12px] font-bold text-text-carbon">Ver ofertas</Text></Pressable>
      </View>
    </LinearGradient>
  </View>;
}

export function DeliveryGuarantee() {
  return <View className="mx-4 mb-5 mt-5 flex-row items-center gap-3 rounded-xl bg-surface-container p-3.5"><Icon name="guarantee" color="#2E7D4F" size={28} /><View className="flex-1"><Text className="font-bold text-text-carbon">Garantía de entrega Abarroteros</Text><Text className="text-home-sm text-text-muted">Pedidos antes de la 1:00 PM se entregan hoy mismo sin costo extra.</Text></View></View>;
}
