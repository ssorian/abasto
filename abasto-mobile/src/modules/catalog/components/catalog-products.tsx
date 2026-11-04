import { Image, Pressable, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { router } from 'expo-router';
import { products, type CatalogProduct } from '../lib/catalog-data';
import { CatalogIcon } from './catalog-chrome';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { Badge } from '../../../components/ui/Badge';

function ProductCard({ product }: { product: CatalogProduct }) {
  return <View className="w-1/2 px-[5px] pb-2.5"><View className="min-h-[331px] flex-1 justify-between rounded-2xl border border-[#E8E2D5] bg-white p-2.5">
    <Pressable accessibilityLabel={product.id === 'coca' ? `Ver detalle de ${product.name}` : `${product.name} (vista de demostración)`} onPress={product.id === 'coca' ? () => router.push('/detalle-producto') : undefined}>{product.badge && <Text numberOfLines={1} className={`absolute left-2 top-2 z-10 max-w-full rounded-md px-2 py-0.5 text-[10px] font-extrabold ${product.badgeKind === 'flash' ? 'bg-[#C83E3E] text-white' : product.badgeKind === 'stock' ? 'bg-stock-green-bg text-stock-green' : 'bg-[#FFCE4B] text-[#735800]'}`}>{product.badge}</Text>}<View className="relative mb-2 aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[#f5f3ee] p-2"><Image source={{ uri: product.image }} resizeMode="contain" className="h-full w-full" /><Badge tone={product.availability === 'Alta rotación' ? 'neutral' : 'stock'} className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px]">{product.availability}</Badge></View>
      <View className="mb-2 min-h-[54px]"><Text className="text-[10px] font-black uppercase tracking-wider text-primary">{product.category}</Text><Text variant="display" numberOfLines={1} className="mt-0.5 text-[14px] font-bold leading-[18px] text-text-carbon">{product.name}</Text><Text className="mt-0.5 text-[11px] leading-4 text-text-muted">{product.pack}</Text></View>
      <View className="mb-2 rounded-xl border border-[#E8E2D5] bg-[#f5f3ee] p-2"><View className="flex-row items-end justify-between"><Text variant="display" className={`text-[18px] font-black leading-5 ${product.featured ? 'text-primary' : 'text-text-carbon'}`}>{product.price}</Text><Text className="text-[10px] font-extrabold uppercase text-text-muted">{product.unit}</Text></View><View className="mt-1 flex-row justify-between border-t border-[#E8E2D5]/40 pt-1"><Text className="text-[10px] font-bold text-stock-green">{product.each}</Text><Text className="text-[10px] text-text-muted">{product.suggested}</Text></View></View>
    </Pressable>
    {product.quantity ? <QuantityStepper className="h-10 flex-row items-center justify-between rounded-xl border border-[#E8E2D5] bg-surface-container p-1" decreaseClassName="h-8 w-8 items-center justify-center rounded-lg bg-white" increaseClassName="h-8 w-8 items-center justify-center rounded-lg bg-primary" valueClassName="items-center" decreaseLabel={`Disminuir cantidad de ${product.name} (vista de demostración)`} increaseLabel={`Aumentar cantidad de ${product.name} (vista de demostración)`} decreaseIcon={<CatalogIcon name="remove" size={16} />} increaseIcon={<CatalogIcon name="add" color="white" size={16} />} value={<><Text variant="display" className="text-[14px] font-black leading-4 text-text-carbon">{product.quantity}</Text><Text className="text-[8px] font-black uppercase tracking-wider text-primary">{product.quantityUnit}</Text></>} /> : <Pressable accessibilityLabel={`Agregar ${product.name} (vista de demostración)`} className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary"><CatalogIcon name="addCart" color="white" size={18} /><Text className="text-[12px] font-bold text-white">+ Agregar</Text></Pressable>}
  </View></View>;
}

export function CatalogProducts() {
  return <View className="flex-row flex-wrap px-[11px] pt-3.5 pb-28">{products.map(product => <ProductCard key={product.id} product={product} />)}</View>;
}
