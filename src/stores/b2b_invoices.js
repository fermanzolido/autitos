import { createCollectionStore } from './createCollectionStore'
import { where } from 'firebase/firestore'

export const useB2bInvoiceStore = createCollectionStore('b2b_invoices', 'b2b_invoices', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory') {
        return []
    }
    if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
        return [where('dealerId', '==', authStore.userClaims.dealerId)]
    }
    return null
})
