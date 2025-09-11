import { createCollectionStore } from './createCollectionStore'

// Dealers are public info, no constraints needed for now.
// An admin/factory will see all, a dealer will also see all to know competitors.
// This could be changed later if needed.
const constraintsFactory = () => []

export const useDealerStore = createCollectionStore('dealers', 'dealers', constraintsFactory)
