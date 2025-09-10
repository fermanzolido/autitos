import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getFirestore, collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useVehicleStore = defineStore('vehicles', () => {
  const vehicles = ref([])
  const availableVehicles = ref([])
  const loading = ref(true)

  const authStore = useAuthStore()
  const db = getFirestore()

  let unsubscribeVehicles = null
  let unsubscribeAvailableVehicles = null

  function setupListeners() {
    if (unsubscribeVehicles) unsubscribeVehicles()
    if (unsubscribeAvailableVehicles) unsubscribeAvailableVehicles()

    loading.value = true

    // Listener for all vehicles based on role
    let vehicleConstraints = []
    if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
        vehicleConstraints.push(where('dealerId', '==', authStore.userClaims.dealerId));
    }
    const vehicleQuery = query(collection(db, 'vehicles'), ...vehicleConstraints);
    unsubscribeVehicles = onSnapshot(vehicleQuery, snapshot => {
        vehicles.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        loading.value = false
    })

    // Listener for vehicles available for sale
    let availableVehicleConstraints = [where('status', '==', 'enConcesionario')];
    if (authStore.role === 'dealer' && authStore.userClaims?.dealerId) {
       availableVehicleConstraints.push(where('dealerId', '==', authStore.userClaims.dealerId));
   }
   const availableVehicleQuery = query(collection(db, 'vehicles'), ...availableVehicleConstraints);
   unsubscribeAvailableVehicles = onSnapshot(availableVehicleQuery, snapshot => {
       availableVehicles.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
   });
  }

  watch(() => authStore.user, (user) => {
    if (user) {
        setupListeners()
    } else {
        if (unsubscribeVehicles) unsubscribeVehicles()
        if (unsubscribeAvailableVehicles) unsubscribeAvailableVehicles()
        vehicles.value = []
        availableVehicles.value = []
        loading.value = true
    }
  })

  return { vehicles, availableVehicles, loading }
})
