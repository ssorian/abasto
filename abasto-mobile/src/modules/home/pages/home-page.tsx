import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeBottomNav, HomeHeader } from '../components/home-chrome';
import { DeliveryGuarantee, Promotion, SearchAndStatus } from '../components/home-highlights';
import { MainCategories, RepeatPurchases, WeeklyDeals } from '../components/home-products';

export default function HomePage() {
  const [toast, setToast] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, id: string | null = null) {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    setAddedId(id);
    timer.current = setTimeout(() => { setToast(null); setAddedId(null); }, 1800);
  }

  return <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
    <View className="mx-auto w-full max-w-screen-sm flex-1 bg-surface">
      <HomeHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <SearchAndStatus onBarcode={() => notify('Iniciando cámara para escanear...')} />
        <Promotion />
        <RepeatPurchases addedId={addedId} onAdd={(id, name) => notify(`Agregado: ${name}`, id)} />
        <MainCategories />
        <WeeklyDeals addedId={addedId} onAdd={(id, name) => notify(`Agregado: ${name}`, id)} />
        <DeliveryGuarantee />
      </ScrollView>
      {toast && <View accessibilityRole="alert" className="absolute bottom-20 self-center rounded-xl bg-text-carbon px-5 py-3"><Text className="text-home-sm font-semibold text-white">{toast}</Text></View>}
      <HomeBottomNav />
    </View>
  </SafeAreaView>;
}
