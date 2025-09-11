import { where } from 'firebase/firestore'
import { createCollectionStore } from './createCollectionStore'

// In this model, customers are shared across the network.
// A dealer might need to see if a customer already exists.
// For a multi-tenant CRM where each dealer has their own customers,
// we would add a constraint here. For now, it's a shared pool.
const constraintsFactory = (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory' || authStore.role === 'dealer') {
        return [] // All authenticated users can see all customers
    }
    return null // No data for unauthenticated users
}

export const useCustomerStore = createCollectionStore('customers', 'customers', constraintsFactory)
