import { warehouseNames } from '#/shared/demo/types'
import { orderChannels } from '#/modules/counter/lib/constants'
import { formatMoney } from '#/modules/counter/lib/money'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/counter/components/form-controls'
import { SectionHelp } from '#/modules/counter/components/info-banner'

import type { WarehouseName } from '#/shared/demo/types'
import type { OrderComposer } from '#/modules/counter/hooks/use-order-composer'
import type {
  Fulfillment,
  OrderChannel,
  PaymentTerms,
} from '#/modules/counter/types/counter'

export const formGrid =
  'grid grid-cols-1 gap-4 md:grid-cols-2 metrics:grid-cols-3'

/** Warehouse, customer, payment terms and (for deferred orders) delivery fields. */
export function ComposerFields({ composer }: { composer: OrderComposer }) {
  const { customer } = composer

  return (
    <>
      <div className={formGrid}>
        <Field label="Almacén">
          <FieldSelect
            value={composer.warehouse}
            onChange={(event) =>
              composer.selectWarehouse(event.target.value as WarehouseName)
            }
          >
            {warehouseNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </FieldSelect>
        </Field>
        <Field label="Cliente">
          <FieldSelect
            value={customer.id}
            onChange={(event) => composer.selectCustomer(event.target.value)}
          >
            {composer.customers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        {!composer.isCounter && (
          <Field label="Origen del pedido">
            <FieldSelect
              value={composer.channel}
              onChange={(event) =>
                composer.setChannel(event.target.value as OrderChannel)
              }
            >
              {orderChannels.map((channel) => (
                <option key={channel}>{channel}</option>
              ))}
            </FieldSelect>
          </Field>
        )}
        <Field label="Condición de pago">
          <FieldSelect
            value={composer.terms}
            onChange={(event) =>
              composer.setTerms(event.target.value as PaymentTerms)
            }
          >
            <option>Contado</option>
            <option disabled={!customer.credit}>Crédito</option>
          </FieldSelect>
        </Field>
        {!composer.isCounter && (
          <>
            <Field label="Entrega">
              <FieldSelect
                value={composer.fulfillment}
                onChange={(event) =>
                  composer.setFulfillment(event.target.value as Fulfillment)
                }
              >
                <option>Recolección</option>
                <option>Domicilio</option>
              </FieldSelect>
            </Field>
            <Field label="Contacto">
              <FieldInput
                value={composer.contact}
                onChange={(event) => composer.setContact(event.target.value)}
              />
            </Field>
            {composer.fulfillment === 'Domicilio' && (
              <Field label="Domicilio">
                <FieldInput
                  list="counter-customer-addresses"
                  value={composer.address}
                  onChange={(event) => composer.setAddress(event.target.value)}
                />
                <datalist id="counter-customer-addresses">
                  {customer.addresses.map((address) => (
                    <option key={address} value={address} />
                  ))}
                </datalist>
              </Field>
            )}
          </>
        )}
      </div>
      {composer.terms === 'Crédito' && (
        <SectionHelp>
          Plazo acordado: {customer.termsDays} días desde el pedido · Límite:{' '}
          {formatMoney(customer.creditLimitCents)}. Los pedidos pendientes
          también utilizan crédito.
        </SectionHelp>
      )}
    </>
  )
}
