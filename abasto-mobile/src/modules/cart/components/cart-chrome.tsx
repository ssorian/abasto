import { StorefrontHeader } from '../../../components/storefront-header';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];
const icons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' }, cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  person: { ios: 'person.fill', android: 'person', web: 'person' }, home: { ios: 'house', android: 'home', web: 'home' },
  catalog: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }, orders: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  storefront: { ios: 'storefront', android: 'storefront', web: 'storefront' }, store: { ios: 'storefront', android: 'store', web: 'store' },
  shipping: { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' }, calendar: { ios: 'calendar', android: 'calendar_clock', web: 'calendar_clock' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' }, add: { ios: 'plus', android: 'add', web: 'add' },
  idea: { ios: 'lightbulb', android: 'tips_and_updates', web: 'tips_and_updates' }, discount: { ios: 'tag', android: 'local_offer', web: 'local_offer' },
  hub: { ios: 'point.3.connected.trianglepath.dotted', android: 'hub', web: 'hub' }, growth: { ios: 'arrow.up.right', android: 'trending_up', web: 'trending_up' },
  guarantee: { ios: 'checkmark.seal', android: 'verified', web: 'verified' }, bag: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
} as const satisfies Record<string, SymbolName>;
export type CartIconName = keyof typeof icons;
export function CartIcon({ name, size = 20, color = '#20252B' }: { name: CartIconName; size?: number; color?: string }) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} />;
}

export function CartHeader() { return <StorefrontHeader section="Carrito" />; }
const tabs: { label: string; icon: CartIconName; href: '/' | '/abarrotes' | '/pedidos' | '/carrito' | '/cuenta' }[] = [{ label: 'Inicio', icon: 'home', href: '/' }, { label: 'Catálogo', icon: 'catalog', href: '/abarrotes' }, { label: 'Pedidos', icon: 'orders', href: '/pedidos' }, { label: 'Carrito', icon: 'cart', href: '/carrito' }, { label: 'Cuenta', icon: 'storefront', href: '/cuenta' }];
export function CartBottomNav() {
  return <View className="h-16 flex-row items-center justify-around border-t border-border-warm bg-surface px-3">{tabs.map((tab) => <Pressable key={tab.label} accessibilityLabel={tab.label} onPress={() => router.push(tab.href)} className="h-14 w-14 items-center justify-center gap-0.5"><View><CartIcon name={tab.icon} size={24} color={tab.label === 'Carrito' ? '#960e12' : '#66717A'} />{tab.label === 'Pedidos' && <View className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-stock-green" />}{tab.label === 'Carrito' && <View className="absolute -right-2 -top-1 rounded-full bg-maize-gold px-1"><Text className="text-[10px] font-bold">3</Text></View>}</View><Text className={tab.label === 'Carrito' ? 'text-[11px] font-bold text-primary' : 'text-[11px] text-text-muted'}>{tab.label}</Text></Pressable>)}</View>;
}
