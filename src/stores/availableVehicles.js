import { where } from 'firebase/firestore'
import { createCollectionStore } from './createCollectionStore'

const constraintsFactory = (authStore) => {
  const constraints = [where('status', '==', 'enConcesionario')]

  // Admins and factory users can see all available vehicles across all dealers
  if (authStore.role === 'admin' || authStore.role === 'factory') {
    return constraints
  }
  // Dealers only see available vehicles at their dealership
  if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
    constraints.push(where('dealerId', '==', authStore.userClaims.dealerId))
    return constraints
  }
  // No data for others
  return null
}

export const useAvailableVehicleStore = createCollectionStore('availableVehicles', 'vehicles', constraintsFactory)
