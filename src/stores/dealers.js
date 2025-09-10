import { createCollectionStore } from './createCollectionStore'

// Dealers can be read by admin and factory roles.
export const useDealerStore = createCollectionStore('dealers', 'dealers', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory') {
        return [] // No constraints, fetch all
    }
    return null // Don't fetch for other roles
})
