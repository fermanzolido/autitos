import { createCollectionStore } from './createCollectionStore'

// Similar to customers, we allow dealers to fetch all and rely on client-side
// filtering for showing interactions related to their customers.
// Security rules will prevent unauthorized access to sensitive data if any were added.
export const useInteractionStore = createCollectionStore('interactions', 'interactions', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'dealer') {
        return []
    }
    return null
})
