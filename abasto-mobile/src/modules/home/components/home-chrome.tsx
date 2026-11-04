import { StorefrontHeader } from '../../../components/storefront-header';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';

type SymbolName = React.ComponentProps<typeof SymbolView>['name'];
const icons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  account: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  catalog: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  orders: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
  storefront: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  barcode: { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' },
  delivery: { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  guarantee: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  offer: { ios: 'tag.fill', android: 'local_offer', web: 'local_offer' },
  beverages: { ios: 'cup.and.saucer.fill', android: 'local_drink', web: 'local_drink' },
  beer: { ios: 'mug.fill', android: 'sports_bar', web: 'sports_bar' },
  snacks: { ios: 'bag.fill', android: 'fastfood', web: 'fastfood' },
  groceries: { ios: 'basket.fill', android: 'kitchen', web: 'kitchen' },
  cleaning: { ios: 'sparkles', android: 'cleaning_services', web: 'cleaning_services' },
  dairy: { ios: 'drop.fill', android: 'egg_alt', web: 'egg_alt' },
  sweets: { ios: 'birthday.cake.fill', android: 'cake', web: 'cake' },
  hygiene: { ios: 'heart.fill', android: 'sanitizer', web: 'sanitizer' },
} as const satisfies Record<string, SymbolName>;
export type HomeIcon = keyof typeof icons;

export function Icon({ name, color = '#20252B', size = 22 }: { name: HomeIcon; color?: string; size?: number }) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} />;
}

export function HomeHeader() { return <StorefrontHeader section="Inicio" />; }

const tabs: { label: string; icon: HomeIcon; href: '/' | '/abarrotes' | '/pedidos' | '/carrito' | '/cuenta' }[] = [
  { label: 'Inicio', icon: 'home', href: '/' }, { label: 'Catálogo', icon: 'catalog', href: '/abarrotes' },
  { label: 'Pedidos', icon: 'orders', href: '/pedidos' }, { label: 'Carrito', icon: 'cart', href: '/carrito' },
  { label: 'Cuenta', icon: 'storefront', href: '/cuenta' },
];
export function HomeBottomNav() {
  return <View className="h-16 flex-row items-center justify-around bg-surface px-3">
    {tabs.map((tab, index) => <Pressable key={tab.label} accessibilityLabel={tab.label} onPress={() => router.push(tab.href)} className="h-14 w-14 items-center justify-center gap-0.5">
      <View><Icon name={tab.icon} size={24} color={index === 0 ? '#960e12' : '#66717A'} />
        {index === 2 && <View className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-stock-green" />}
        {index === 3 && <View className="absolute -right-2 -top-1 rounded-full bg-maize-gold px-1"><Text className="text-home-xs font-bold">3</Text></View>}
      </View><Text className={index === 0 ? 'text-home-xs font-bold text-primary' : 'text-home-xs text-text-muted'}>{tab.label}</Text>
    </Pressable>)}
  </View>;
}
