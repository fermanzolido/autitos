import { where } from 'firebase/firestore'
import { createCollectionStore } from './createCollectionStore'

const constraintsFactory = (authStore) => {
  // Admins and factory users see all sales
  if (authStore.role === 'admin' || authStore.role === 'factory') {
    return [] // No constraints
  }
  // Dealers only see sales from their dealership
  if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
    return [where('dealerId', '==', authStore.userClaims.dealerId)]
  }
  // If user is not logged in or has no role/dealerId, fetch nothing
  return null
}

export const useSaleStore = createCollectionStore('sales', 'sales', constraintsFactory)
