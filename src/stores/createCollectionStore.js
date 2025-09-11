import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'

export function createCollectionStore(id, collectionName, constraintsFactory = null) {
  return defineStore(id, () => {
    const items = ref([])
    const loading = ref(true)

    const authStore = useAuthStore()

    let unsubscribe = null

    function setupListener() {
      if (unsubscribe) unsubscribe()

      loading.value = true

      let q = collection(db, collectionName)
      if (constraintsFactory) {
        const constraints = constraintsFactory(authStore)
        // A null return from the factory means we should not fetch the collection.
        if (constraints === null) {
          items.value = []
          loading.value = false
          return
        }
        // An empty array means no constraints, fetch all.
        if (constraints.length > 0) {
            q = query(q, ...constraints)
        }
      }

      unsubscribe = onSnapshot(q, snapshot => {
        items.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        loading.value = false
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        loading.value = false;
      })
    }

    watch(() => authStore.user, (user) => {
      if (user) {
        // The listener will be set up once the user's role is confirmed.
        // Watching role to ensure claims are loaded.
        watch(() => authStore.role, (role) => {
            if (role) setupListener();
        }, { immediate: true });
      } else {
        if (unsubscribe) unsubscribe()
        items.value = []
        loading.value = true
      }
    }, { immediate: true })

    return { items, loading }
  })
}
