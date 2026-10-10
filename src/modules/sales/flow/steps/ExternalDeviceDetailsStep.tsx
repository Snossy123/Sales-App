import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type { Employee, GpsProduct, PaginatedResponse } from '../../../../api/types'
import {
  createDeviceLine,
  DeviceLineCard,
  type DeviceLineDraft,
} from '../../../../components/pos/DeviceLineCard'
import { posStepperClass } from '../../../../components/pos/posFormStyles'
import { Icon } from '../../../../components/Icon'
import { resolveGpsUnitPrice } from '../../../../lib/gpsProductPricing'
import { useOrgSettingsStore } from '../../../../stores/orgSettingsStore'
import type { PosFlowDraft } from '../posFlowTypes'

function clampDeviceIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(Math.max(index, 0), count - 1)
}

function syncExternalLines(input: {
  quantity: number
  existing: DeviceLineDraft[]
  product?: GpsProduct
  contractDate: string
  minDownPercent: number
}): DeviceLineDraft[] {
  if (input.quantity <= 0) return []
  const next: DeviceLineDraft[] = []
  for (let index = 0; index < input.quantity; index += 1) {
    const existing = input.existing[index]
    const paymentTerm = existing?.paymentTerm ?? 'installment'
    const renewalType = existing?.renewalType ?? 'annual'
    const price = input.product
      ? resolveGpsUnitPrice(input.product, {
          contractKind: 'external_device',
          paymentTerm,
          renewalType,
        })
      : existing?.unitPrice ?? 0
    if (existing) {
      next.push({ ...existing, unitPrice: price, productUnitId: undefined })
    } else {
      next.push(
        createDeviceLine(price, undefined, {
          contractDate: input.contractDate,
          minDownPercent: input.minDownPercent,
        }),
      )
    }
  }
  return next
}