import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BrandText as Text } from '../../../components/ui/brand-text';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import { ProductIcon } from './product-chrome';

const currency = (value: number) => '$' + value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function ProductOrderBar() {
  const [quantity, setQuantity] = useState(2);
  const [added, setAdded] = useState(false);
  useEffect(() => { if (!added) return; const timer = setTimeout(() => setAdded(false), 1600); return () => clearTimeout(timer); }, [added]);
  const unitPrice = quantity >= 6 ? 385 : quantity >= 3 ? 398 : 412.8;
  const indicator = quantity >= 6 ? '¡Máximo Descuento 12% aplicado!' : quantity >= 3 ? '¡Precio Escala Fin de Semana (-8%)!' : `Comprando ${quantity} cajas: Precio base`;
  return <View className="bg-white px-4 py-3 shadow-lg"><View className="mb-2 flex-row items-center justify-between px-1"><View className="min-w-0 flex-1 flex-row items-center gap-1.5"><View className="h-2 w-2 rounded-full bg-stock-green" /><Text numberOfLines={1} className={`text-[12px] ${quantity >= 6 ? 'font-bold text-stock-green' : quantity >= 3 ? 'font-bold text-primary' : 'text-text-muted'}`}>{indicator}</Text></View><Text className="text-[11px] font-bold text-stock-green">+{quantity * 24} botellas para tu tienda</Text></View><View className="flex-row items-center gap-3"><QuantityStepper className="h-[52px] flex-row items-center rounded-lg bg-surface-container-low p-1" decreaseClassName={`h-11 w-11 items-center justify-center ${quantity <= 1 ? 'opacity-40' : ''}`} increaseClassName="h-11 w-11 items-center justify-center" valueClassName="min-w-[54px] items-center px-2.5" decreaseLabel="Disminuir una caja" increaseLabel="Aumentar una caja" decreaseDisabled={quantity <= 1} increaseDisabled={quantity >= 99} onDecrease={() => setQuantity(q => Math.max(1, q - 1))} onIncrease={() => setQuantity(q => Math.min(99, q + 1))} decreaseIcon={<ProductIcon name="minus" />} increaseIcon={<ProductIcon name="plus" />} value={<><Text variant="display" className="text-[18px] font-bold leading-5 text-text-carbon">{quantity}</Text><Text className="text-[10px] font-extrabold uppercase text-text-muted">cajas</Text></>} /><Pressable accessibilityLabel="Agregar al pedido (vista de demostración)" onPress={() => { setAdded(true); setTimeout(() => router.push('/carrito'), 600); }} className={`h-[52px] min-w-0 flex-1 flex-row items-center justify-between gap-1 rounded-lg px-4 ${added ? 'bg-stock-green' : 'bg-red-institutional'}`}><View className="min-w-0 flex-1 flex-row items-center gap-2"><ProductIcon name={added ? 'success' : 'addCart'} color="white" /><Text className="min-w-0 flex-1 text-center text-[14px] font-bold text-white">{added ? '¡Agregado con Éxito!' : 'Agregar al Pedido'}</Text></View><Text variant="display" className="text-[18px] font-extrabold text-white">{currency(unitPrice * quantity)}</Text></Pressable></View></View>;
}
