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
import { getFunctions, httpsCallable } from 'firebase/functions'
import Chart from 'chart.js/auto' // Keep for now, might be used later

const authStore = useAuthStore()
const functions = getFunctions()

const stats = ref({})
const loading = ref(true)

async function fetchDashboardStats() {
  loading.value = true
  try {
    const getDashboardStats = httpsCallable(functions, 'getDashboardStats')
    const result = await getDashboardStats()
    stats.value = result.data
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    // Optionally, show an error message to the user
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardStats()
})

</script>
