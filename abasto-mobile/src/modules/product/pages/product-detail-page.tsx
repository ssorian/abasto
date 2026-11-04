import { ScrollView, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductHeader, ProductIcon } from '../components/product-chrome';
import { ProductPricing, ProductVolumeTiers, ProductUnits, ProductLogistics } from '../components/product-details';
import { ProductGallery } from '../components/product-gallery';
import { ProductOrderBar } from '../components/product-order-bar';

export default function ProductDetailPage() {
  return <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}><View className="mx-auto w-full max-w-screen-sm flex-1"><ProductHeader /><ScrollView showsVerticalScrollIndicator={false}><View className="px-3 pb-1 pt-2"><View className="flex-row items-center gap-1.5"><Text className="text-[12px] text-text-muted">Bebidas</Text><ProductIcon name="next" size={14} color="#66717A" /><Text className="text-[12px] text-text-muted">Refrescos</Text><ProductIcon name="next" size={14} color="#66717A" /><Text className="text-[11px] font-bold text-text-carbon">Refrescos de Cola</Text></View><View className="mt-2 flex-row items-center justify-between gap-2"><View className="min-w-0 flex-row items-center gap-1 rounded-full bg-surface-container px-2.5 py-1"><ProductIcon name="verified" size={14} color="#960e12" /><Text numberOfLines={1} className="text-[11px] font-bold uppercase tracking-wider text-text-muted">The Coca-Cola Company</Text></View><Text className="text-[11px] font-bold text-text-muted">SKU: 7501055300075</Text></View></View><View className="px-3 pb-2 pt-1"><Text variant="display" className="text-[24px] font-bold leading-8 text-text-carbon">Coca-Cola Original 600 ml</Text><Text className="mt-0.5 text-[14px] leading-5 text-text-muted">Caja corrugada flejada de distribución con 24 botellas PET no retornables</Text></View><ProductGallery /><ProductPricing /><ProductVolumeTiers /><ProductUnits /><ProductLogistics /></ScrollView><ProductOrderBar /></View></SafeAreaView>;
}
