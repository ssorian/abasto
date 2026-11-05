import type { TransferListItem } from '#/modules/transfers/services/transfer-reads'

/** What the Traslados tab needs for the selected warehouse. */
export type TransfersOverview = {
  transfers: Array<TransferListItem>
  /** Warehouses the actor can send to; empty unless they manage the selected one. */
  destinations: Array<{ id: string; name: string }>
}
