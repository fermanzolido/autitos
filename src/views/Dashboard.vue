<template>
  <div>
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>

    <div v-if="loading" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Admin/Factory View -->
      <template v-if="authStore.role === 'admin' || authStore.role === 'factory'">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Vehículos en Stock</h3>
          <p class="text-4xl font-bold text-blue-600">{{ stats.vehiclesInStock || 0 }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Ventas Totales</h3>
          <p class="text-4xl font-bold text-green-600">{{ stats.totalSales || 0 }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Concesionarios Activos</h3>
          <p class="text-4xl font-bold text-purple-600">{{ stats.totalDealers || 0 }}</p>
        </div>
         <!-- Placeholder for other admin stats -->
      </template>

      <!-- Dealer View -->
      <template v-if="authStore.role === 'dealer'">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Mis Vehículos en Stock</h3>
          <p class="text-4xl font-bold text-blue-600">{{ stats.vehiclesInStock || 0 }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Mis Ventas Totales</h3>
          <p class="text-4xl font-bold text-green-600">{{ stats.totalSales || 0 }}</p>
        </div>
         <!-- Placeholders for other dealer stats -->
      </template>
    </div>

    <!-- The sales chart can be re-implemented later if needed -->
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Chart from 'chart.js/auto' // Keep for now, might be used later

const authStore = useAuthStore()

const stats = ref({})
const loading = ref(true)
const error = ref(null)

// IMPORTANT: Replace with your actual cloud function URL
const functionsUrl = 'https://us-central1-autitos-82ad2.cloudfunctions.net'

async function fetchDashboardStats() {
  loading.value = true
  error.value = null

  if (!authStore.user) {
      error.value = "User not authenticated."
      loading.value = false
      return
  }

  try {
    const token = await authStore.user.getIdToken()
    const response = await fetch(`${functionsUrl}/getDashboardStats`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    stats.value = await response.json()

  } catch (err) {
    console.error("Error fetching dashboard stats:", err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardStats()
})

</script>
