import { createCollectionStore } from './createCollectionStore'
import { where } from 'firebase/firestore'

export const useFactoryOrderStore = createCollectionStore('factory_orders', 'factory_orders', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory') {
        return []
    }
    if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
        return [where('dealerId', '==', authStore.userClaims.dealerId)]
    }
    return null
})
