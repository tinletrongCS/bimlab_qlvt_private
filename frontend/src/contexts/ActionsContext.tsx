import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  createAsset,
  createContract,
  createMaintenanceRecord,
  createPurchaseRequest,
  createSubscription,
  createTransfer,
  createVendor,
  deleteAsset,
  deleteContract,
  deleteMaintenanceRecord,
  deletePurchaseRequest,
  deleteSubscription,
  deleteTransfer,
  deleteVendor,
  disposeAsset,
  updateAsset,
  updateContract,
  updateMaintenanceRecord,
  updatePurchaseRequest,
  updatePurchaseRequestStatus,
  updateSubscription,
  updateVendor,
} from '../services/api'
import type {
  AssetItem,
  AssetPayload,
  AssetTransferPayload,
  Contract,
  ContractPayload,
  MaintenanceRecord,
  MaintenanceRecordPayload,
  PurchaseRequest,
  PurchaseRequestPayload,
  Subscription,
  SubscriptionPayload,
  Vendor,
  VendorPayload,
} from '../services/types'
import { useAppData } from './AppDataContext'

export type ModalState =
  | { type: 'vendor'; mode: 'create'; item?: undefined }
  | { type: 'vendor'; mode: 'edit'; item: Vendor }
  | { type: 'asset'; mode: 'create'; item?: undefined }
  | { type: 'asset'; mode: 'edit'; item: AssetItem }
  | { type: 'subscription'; mode: 'create'; item?: undefined }
  | { type: 'subscription'; mode: 'edit'; item: Subscription }
  | { type: 'request'; mode: 'create'; item?: undefined }
  | { type: 'request'; mode: 'edit'; item: PurchaseRequest }
  | { type: 'contract'; mode: 'create'; item?: undefined }
  | { type: 'contract'; mode: 'edit'; item: Contract }
  | { type: 'maintenance'; mode: 'create'; item?: undefined }
  | { type: 'maintenance'; mode: 'edit'; item: MaintenanceRecord }
  | { type: 'transfer'; mode: 'create'; item?: undefined }
  | null

export type ModalPayload =
  | VendorPayload
  | AssetPayload
  | SubscriptionPayload
  | PurchaseRequestPayload
  | ContractPayload
  | MaintenanceRecordPayload
  | AssetTransferPayload

export type DeleteResource =
  | 'vendors'
  | 'assets'
  | 'subscriptions'
  | 'requests'
  | 'contracts'
  | 'maintenance'
  | 'transfers'

interface ActionsContextValue {
  submitting: boolean
  modal: ModalState
  openModal: (modal: NonNullable<ModalState>) => void
  closeModal: () => void
  submitModal: (payload: ModalPayload) => Promise<void>
  deleteResource: (type: DeleteResource, id: number) => Promise<void>
  approveRequest: (id: number, status: string) => Promise<void>
  disposeAssetAction: (item: AssetItem) => Promise<void>
  revokeAsset: (item: AssetItem) => Promise<void>
}

const ActionsContext = createContext<ActionsContextValue | null>(null)

export function ActionsProvider({ children }: { children: ReactNode }) {
  const { refresh, setError } = useAppData()
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const openModal = useCallback((next: NonNullable<ModalState>) => setModal(next), [])
  const closeModal = useCallback(() => setModal(null), [])

  const submitModal = useCallback(
    async (payload: ModalPayload) => {
      if (!modal) return
      setSubmitting(true)
      setError('')
      try {
        if (modal.type === 'vendor') {
          if (modal.mode === 'create') await createVendor(payload as VendorPayload)
          else await updateVendor(modal.item.id, payload as VendorPayload)
        } else if (modal.type === 'asset') {
          if (modal.mode === 'create') await createAsset(payload as AssetPayload)
          else await updateAsset(modal.item.id, payload as AssetPayload)
        } else if (modal.type === 'subscription') {
          if (modal.mode === 'create') await createSubscription(payload as SubscriptionPayload)
          else await updateSubscription(modal.item.id, payload as SubscriptionPayload)
        } else if (modal.type === 'request') {
          if (modal.mode === 'create') await createPurchaseRequest(payload as PurchaseRequestPayload)
          else await updatePurchaseRequest(modal.item.id, payload as PurchaseRequestPayload)
        } else if (modal.type === 'contract') {
          if (modal.mode === 'create') await createContract(payload as ContractPayload)
          else await updateContract(modal.item.id, payload as ContractPayload)
        } else if (modal.type === 'maintenance') {
          if (modal.mode === 'create') await createMaintenanceRecord(payload as MaintenanceRecordPayload)
          else await updateMaintenanceRecord(modal.item.id, payload as MaintenanceRecordPayload)
        } else if (modal.type === 'transfer') {
          await createTransfer(payload as AssetTransferPayload)
        }
        setModal(null)
        await refresh()
      } catch (err) {
        setError(readError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [modal, refresh, setError],
  )

  const deleteResource = useCallback(
    async (type: DeleteResource, id: number) => {
      if (!window.confirm('Xóa dữ liệu này?')) return
      setSubmitting(true)
      setError('')
      try {
        if (type === 'vendors') await deleteVendor(id)
        else if (type === 'assets') await deleteAsset(id)
        else if (type === 'subscriptions') await deleteSubscription(id)
        else if (type === 'requests') await deletePurchaseRequest(id)
        else if (type === 'contracts') await deleteContract(id)
        else if (type === 'maintenance') await deleteMaintenanceRecord(id)
        else if (type === 'transfers') await deleteTransfer(id)
        await refresh()
      } catch (err) {
        setError(readError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [refresh, setError],
  )

  const approveRequest = useCallback(
    async (id: number, status: string) => {
      setSubmitting(true)
      setError('')
      try {
        await updatePurchaseRequestStatus(id, status)
        await refresh()
      } catch (err) {
        setError(readError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [refresh, setError],
  )

  const disposeAssetAction = useCallback(
    async (item: AssetItem) => {
      const dateStr = window.prompt(
        `Thanh lý tài sản "${item.name}"\n\nNgày thanh lý (YYYY-MM-DD):`,
        new Date().toISOString().slice(0, 10),
      )
      if (!dateStr) return
      const priceStr = window.prompt('Giá thanh lý (VND, để trống nếu không có):', '')
      const reason = window.prompt('Lý do thanh lý:', '') || ''
      setSubmitting(true)
      setError('')
      try {
        await disposeAsset(item.id, {
          disposalDate: dateStr,
          disposalPrice: priceStr ? Number(priceStr) : null,
          disposalReason: reason,
        })
        await refresh()
      } catch (err) {
        setError(readError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [refresh, setError],
  )

  const revokeAsset = useCallback(
    async (item: AssetItem) => {
      setSubmitting(true)
      setError('')
      try {
        await updateAsset(item.id, {
          assetCode: item.assetCode,
          name: item.name,
          category: item.category,
          serialNumber: item.serialNumber,
          source: item.source,
          vendorId: item.vendor?.id || null,
          assignedEmployeeId: null,
          departmentId: item.departmentId || null,
          siteId: item.siteId || null,
          projectId: item.projectId || null,
          purchaseCost: item.purchaseCost || null,
          residualValue: item.residualValue || null,
          purchaseDate: item.purchaseDate,
          warrantyUntil: item.warrantyUntil,
          status: 'IN_STOCK',
          depreciationMethod: item.depreciationMethod,
          usefulLifeYears: item.usefulLifeYears || null,
        })
        await refresh()
      } catch (err) {
        setError(readError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [refresh, setError],
  )

  const value = useMemo<ActionsContextValue>(
    () => ({
      submitting,
      modal,
      openModal,
      closeModal,
      submitModal,
      deleteResource,
      approveRequest,
      disposeAssetAction,
      revokeAsset,
    }),
    [submitting, modal, openModal, closeModal, submitModal, deleteResource, approveRequest, disposeAssetAction, revokeAsset],
  )

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>
}

export function useActions(): ActionsContextValue {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useActions must be used inside <ActionsProvider>')
  return ctx
}

function readError(error: unknown): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || 'Không thể xử lý yêu cầu'
  }
  return 'Không thể xử lý yêu cầu'
}
