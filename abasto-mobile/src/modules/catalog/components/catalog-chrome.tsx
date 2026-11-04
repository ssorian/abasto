import { StorefrontHeader } from '../../../components/storefront-header';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];
const icons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  home: { ios: 'house', android: 'home', web: 'home' },
  catalog: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
  orders: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  storefront: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  barcode: { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' },
  tune: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  down: { ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  remove: { ios: 'minus', android: 'remove', web: 'remove' },
  addCart: { ios: 'cart.badge.plus', android: 'add_shopping_cart', web: 'add_shopping_cart' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
} as const satisfies Record<string, SymbolName>;
export type CatalogIconName = keyof typeof icons;
export function CatalogIcon({ name, color = '#20252B', size = 22 }: { name: CatalogIconName; color?: string; size?: number }) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} />;
}

export function CatalogHeader() { return <StorefrontHeader section="Catálogo" logoVariant="tile" />; }
const tabs: { label: string; icon: CatalogIconName; href: '/' | '/abarrotes' | '/pedidos' | '/carrito' | '/cuenta' }[] = [
  { label: 'Inicio', icon: 'home', href: '/' }, { label: 'Catálogo', icon: 'catalog', href: '/abarrotes' }, { label: 'Pedidos', icon: 'orders', href: '/pedidos' }, { label: 'Carrito', icon: 'cart', href: '/carrito' }, { label: 'Cuenta', icon: 'storefront', href: '/cuenta' },
];
export function CatalogBottomNav() {
  return <View className="h-16 flex-row items-center justify-around border-t border-[#E8E2D5] bg-surface px-3">{tabs.map((tab, index) => <Pressable key={tab.label} accessibilityLabel={tab.label} onPress={() => router.push(tab.href)} className="h-14 w-14 items-center justify-center gap-0.5"><View><CatalogIcon name={tab.icon} size={24} color={index === 1 ? '#960e12' : '#66717A'} />{index === 2 && <View className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-stock-green" />}{index === 3 && <View className="absolute -right-2 -top-1 rounded-full bg-maize-gold px-1"><Text className="text-[10px] font-bold">3</Text></View>}</View><Text className={index === 1 ? 'text-[11px] font-bold text-primary' : 'text-[11px] text-text-muted'}>{tab.label}</Text></Pressable>)}</View>;
}
export function FloatingCart() {
  return <View className="absolute bottom-16 left-0 right-0 px-4 pb-2"><View className="flex-row items-center justify-between gap-2 rounded-2xl bg-text-carbon p-2.5"><View className="min-w-0 flex-1 flex-row items-center gap-2.5"><View className="h-9 w-9 items-center justify-center rounded-xl bg-primary"><Text className="text-lg font-black text-white">3</Text></View><View className="min-w-0"><Text className="text-[11px] font-bold uppercase tracking-wider text-[#FFDF95]">3 bultos / cajas</Text><Text variant="display" numberOfLines={1} className="text-[16px] font-extrabold text-white">$1,304.80 MXN</Text></View></View><Pressable accessibilityLabel="Ver Carrito" onPress={() => router.push('/carrito')} className="h-10 flex-row items-center gap-1 rounded-xl bg-maize-gold px-3"><Text className="text-[13px] font-black text-text-carbon">Ver Carrito</Text><CatalogIcon name="arrow" size={18} /></Pressable></View></View>;
}
