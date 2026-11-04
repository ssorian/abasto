import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { IconButton } from '../../../components/ui/IconButton';
import { BrandText as Text } from '../../../components/ui/brand-text';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];
const icons = {
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  next: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  offer: { ios: 'tag.fill', android: 'local_offer', web: 'local_offer' },
  stock: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  zoom: { ios: 'plus.magnifyingglass', android: 'zoom_in', web: 'zoom_in' },
  trending: { ios: 'arrow.up.right', android: 'trending_up', web: 'trending_up' },
  rotate: { ios: 'rotate.3d', android: '360', web: '360' },
  store: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  payments: { ios: 'banknote', android: 'payments', web: 'payments' },
  tiers: { ios: 'chart.bar.fill', android: 'stacked_bar_chart', web: 'stacked_bar_chart' },
  star: { ios: 'star.fill', android: 'stars', web: 'stars' },
  delivery: { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' },
  box: { ios: 'shippingbox', android: 'inventory', web: 'inventory' },
  scale: { ios: 'scalemass', android: 'scale', web: 'scale' },
  calendar: { ios: 'calendar', android: 'calendar_clock', web: 'calendar_clock' },
  barcode: { ios: 'barcode', android: 'barcode_scanner', web: 'barcode_scanner' },
  schedule: { ios: 'clock', android: 'schedule', web: 'schedule' },
  return: { ios: 'arrow.uturn.backward', android: 'assignment_return', web: 'assignment_return' },
  receipt: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  addCart: { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' },
  success: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
} as const satisfies Record<string, SymbolName>;
export type ProductIconName = keyof typeof icons;
export function ProductIcon({ name, color = '#20252B', size = 20 }: { name: ProductIconName; color?: string; size?: number }) {
  return <SymbolView name={icons[name]} tintColor={color} size={size} />;
}

export function ProductHeader() {
  return <View className="h-16 flex-row items-center justify-between gap-2 bg-surface px-3">
    <View className="min-w-0 flex-1 flex-row items-center"><IconButton accessibilityLabel="Volver" onPress={() => router.back()}><ProductIcon name="back" size={24} /></IconButton><View className="min-w-0 flex-1"><Text variant="display" numberOfLines={1} className="text-[18px] font-semibold text-text-carbon">Detalle De Producto — Ficha Mayorista</Text><Text numberOfLines={1} className="text-[11px] font-bold text-text-muted">Abarrotes Lupita</Text></View></View>
    <View className="flex-row"><Pressable accessibilityLabel="Notificaciones (vista de demostración)" className="h-11 w-11 items-center justify-center"><ProductIcon name="bell" size={22} /><View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" /></Pressable><IconButton accessibilityLabel="Carrito de compras" onPress={() => router.push('/carrito')}> <ProductIcon name="cart" size={22} /><View className="absolute right-1 top-1 rounded-full bg-maize-gold px-1"><Text className="text-[11px] font-extrabold">3</Text></View></IconButton></View>
  </View>;
}
