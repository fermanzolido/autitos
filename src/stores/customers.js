import { createCollectionStore } from './createCollectionStore'

// Admins and dealers can read customers.
// More granular rules are difficult on the client-side without data duplication.
// The security is enforced by Firestore rules; this is for data fetching.
export const useCustomerStore = createCollectionStore('customers', 'customers', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'dealer') {
        return []
    }
    return null
})
