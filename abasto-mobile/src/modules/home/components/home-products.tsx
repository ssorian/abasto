import { Image, Pressable, ScrollView, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { Button } from '../../../components/ui/Button';
import { router } from 'expo-router';
import { categories, repeatProducts, weeklyDeals } from '../lib/home-data';
import { Icon } from './home-chrome';

function Heading({ title, action, onAction, offer = false }: { title: string; action?: string; onAction?: () => void; offer?: boolean }) {
  return <View className={`flex-row items-center justify-between gap-2 px-4 ${offer || title === 'Categorías principales' ? 'mb-3' : 'mb-2'}`}><View className="min-w-0 flex-1 flex-row items-center gap-1.5">{title === 'Comprar nuevamente' && <Icon name="sync" color="#960e12" size={20} />}{offer && <Icon name="offer" color="#B18A2A" size={22} />}<Text variant="display" numberOfLines={1} className="flex-shrink text-[18px] font-bold leading-6 text-text-carbon">{title}</Text></View>{offer && <Text className="shrink-0 rounded bg-maize-gold/30 px-2 py-1 text-home-xs font-bold text-[#7D5D00]">Mayor margen</Text>}{action && <Pressable onPress={onAction} accessibilityLabel={onAction ? action : `${action} (vista de demostración)`} className="shrink-0 justify-center"><Text className="text-[11px] font-bold text-primary">{action}</Text></Pressable>}</View>;
}

export function RepeatPurchases({ onAdd, addedId }: { onAdd: (id: string, name: string) => void; addedId: string | null }) {
  return <View className="mt-4"><Heading title="Comprar nuevamente" action="Ver todo el historial" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 2, paddingBottom: 8 }}>
    {repeatProducts.map(product => <View key={product.id} className="w-[204px] justify-between rounded-xl bg-white p-3">
      <View className="my-1 h-28 items-center justify-center"><Image source={{ uri: product.imageUri }} resizeMode="contain" className="h-24 w-full" /><Text className={`absolute top-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${product.label.includes('-') ? 'right-0 bg-maize-gold text-text-carbon' : 'left-0 bg-stock-green-bg text-stock-green'}`}>{product.label}</Text></View>
      <View><Text className="text-[11px] font-bold uppercase leading-[14px] tracking-wide text-text-muted">{product.detail}</Text><Text numberOfLines={2} className="mt-0.5 min-h-10 text-[14px] font-bold leading-5 text-text-carbon">{product.name}</Text><View className="mt-2"><Text variant="display" className="text-[22px] font-extrabold leading-[26px] text-text-carbon">{product.price}</Text><Text className="text-[12px] leading-4 text-text-muted">{product.unitPrice}</Text></View></View>
      <Button className="mt-3 gap-1 rounded-lg px-2 py-2" onPress={() => onAdd(product.id, product.name)} accessibilityLabel={`Agregar ${product.name} (vista de demostración)`}><Icon name={addedId === product.id ? 'check' : 'add'} color="white" size={18} /><Text className="font-bold text-white">{addedId === product.id ? '¡Listo!' : '+ Agregar'}</Text></Button>
    </View>)}
  </ScrollView></View>;
}

export function MainCategories() {
  return <View className="mt-4"><Heading title="Categorías principales" action="Ver catálogo" onAction={() => router.push('/abarrotes')} /><View className="flex-row flex-wrap gap-y-2.5 px-[11px]">
    {categories.map(category => <View key={category.name} className="w-1/4 px-[5px]"><Pressable accessibilityLabel={`${category.name} (vista de demostración)`} className="items-center rounded-xl bg-white p-2"><View className="mb-1 h-11 w-11 items-center justify-center rounded-lg bg-surface-container"><Icon name={category.icon} color="#960e12" size={24} /></View><Text className="w-full text-center text-home-xs font-bold text-text-carbon">{category.name}</Text></Pressable></View>)}
  </View></View>;
}

export function WeeklyDeals({ onAdd, addedId }: { onAdd: (id: string, name: string) => void; addedId: string | null }) {
  return <View className="mt-5"><Heading title="Ofertas de la semana" offer /><View className="flex-row gap-3 px-4">
    {weeklyDeals.map(deal => <View key={deal.id} className="min-w-0 flex-1 rounded-xl bg-white p-3"><View className="h-8 flex-row items-start justify-between gap-1"><Text className="text-[10px] font-semibold text-stock-green">● {deal.stock}</Text><Text className="rounded-full bg-maize-gold px-1 text-[10px] font-bold text-text-carbon">{deal.saving}</Text></View><View className="h-20 items-center justify-center"><Image source={{ uri: deal.imageUri }} resizeMode="contain" className="h-20 w-full" /></View>
      <Text className="mt-2 text-home-xs font-bold uppercase text-text-muted">{deal.packageLabel}</Text><Text numberOfLines={2} className="mt-1 min-h-10 text-home-sm font-bold text-text-carbon">{deal.name}</Text><Text variant="display" className="mt-2 text-[22px] font-extrabold leading-[26px] text-red-institutional">{deal.price}</Text><Text className="text-home-xs text-text-muted line-through">{deal.previousPrice}</Text><Text className="text-home-xs font-semibold text-stock-green">{deal.unitPrice}</Text>
      <Button className="mt-2 min-h-11 gap-1 rounded-lg" onPress={() => onAdd(deal.id, deal.name)} accessibilityLabel={`Surtir ${deal.name} (vista de demostración)`}><Icon name={addedId === deal.id ? 'check' : 'add'} color="white" size={16} /><Text className="text-home-xs font-bold text-white">{addedId === deal.id ? '¡Listo!' : deal.id === 'nescafe' ? 'Surtir bulto' : 'Surtir caja'}</Text></Button>
    </View>)}
  </View></View>;
}
