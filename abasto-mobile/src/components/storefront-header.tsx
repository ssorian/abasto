import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, Pressable, View } from 'react-native';
import { BrandText as Text } from './ui/brand-text';

const wordmark = require('../../assets/images/storefront-wordmark.jpg');
const tileLogo = require('../../assets/images/storefront-tile.jpg');
const icons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  cart: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  person: { ios: 'person', android: 'person', web: 'person' },
  down: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
} as const satisfies Record<string, React.ComponentProps<typeof SymbolView>['name']>;

export function StorefrontHeader({ section, logoVariant = 'wordmark' }: { section: string; logoVariant?: 'wordmark' | 'tile' }) {
  const tile = logoVariant === 'tile';
  return <View className={`h-16 flex-row items-center justify-between bg-surface px-4 ${tile ? 'border-b border-border-warm' : 'shadow-sm'}`}>
    <View className="min-w-0 flex-1 flex-row items-center gap-2">
      {tile ? <View className="h-9 w-9 items-center justify-center rounded-lg border border-border-warm bg-white p-0.5"><Image source={tileLogo} resizeMode="contain" style={{ width: 30, height: 30 }} /></View> : <Image source={wordmark} resizeMode="contain" style={{ width: 32, height: 32 }} />}
      <View className="min-w-0"><View className="flex-row items-center gap-1"><Text variant={tile ? 'display' : 'body'} numberOfLines={1} className="text-[14px] font-bold text-text-carbon">Abarrotes Lupita</Text><SymbolView name={icons.down} size={16} tintColor="#66717A" /></View><Text numberOfLines={1} className="text-[11px] font-extrabold uppercase tracking-wider text-primary">{section}</Text></View>
    </View>
    <View className="flex-row items-center">
      <Pressable accessibilityLabel="Notificaciones (vista de demostración)" className="h-11 w-11 items-center justify-center"><SymbolView name={icons.bell} size={22} tintColor="#20252B" /><View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" /></Pressable>
      <Pressable accessibilityLabel="Carrito de compras, 3 artículos" onPress={() => router.push('/carrito')} className="h-11 w-11 items-center justify-center"><SymbolView name={icons.cart} size={22} tintColor="#20252B" /><View className="absolute right-0 top-0 rounded-full bg-maize-gold px-1.5"><Text className="text-[11px] font-extrabold text-text-carbon">3</Text></View></Pressable>
      <Pressable accessibilityLabel="Cuenta" onPress={() => router.push('/cuenta')} className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-primary"><SymbolView name={icons.person} size={18} tintColor="white" /></Pressable>
    </View>
  </View>;
}
