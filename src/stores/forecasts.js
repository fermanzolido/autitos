import { createCollectionStore } from './createCollectionStore'

export const useForecastStore = createCollectionStore('forecasts', 'forecasts', (authStore) => {
    if (authStore.role === 'admin' || authStore.role === 'factory') {
        return []
    }
    return null
})
