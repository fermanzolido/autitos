import { createCollectionStore } from './createCollectionStore'
import { where } from 'firebase/firestore'

export const useSaleStore = createCollectionStore('sales', 'sales', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory') {
        return [] // Admins and factory see all sales
    }
    if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
        return [where('dealerId', '==', authStore.userClaims.dealerId)]
    }
    return null // No access for others
})
