<template>
  <div v-if="authStore.authLoading" class="flex justify-center items-center h-screen">
    <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
  </div>
  <Login v-else-if="!authStore.user" />
  <div v-else class="flex bg-gray-100">
    <Sidebar />
    <main id="page-content" class="flex-1 p-8 overflow-y-auto h-screen">
      <component :is="currentPageComponent" />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import Login from '@/components/Login.vue'
import Sidebar from '@/components/Sidebar.vue'
import Dashboard from '@/views/Dashboard.vue'
import Vehicles from '@/views/Vehicles.vue'
import Dealers from '@/views/Dealers.vue'
import Sales from '@/views/Sales.vue'
import Customers from '@/views/Customers.vue'
import B2BInvoices from '@/views/B2BInvoices.vue'
import BIDashboard from '@/views/BIDashboard.vue'
import DemandAnalysis from '@/views/DemandAnalysis.vue'
import Forecasts from '@/views/Forecasts.vue'
import FactoryOrders from '@/views/FactoryOrders.vue'
import FactoryOrdersAdmin from '@/views/FactoryOrdersAdmin.vue'
import ScheduledFollowUps from '@/views/ScheduledFollowUps.vue'
import Reports from '@/views/Reports.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

const pages = {
  dashboard: Dashboard,
  vehicles: Vehicles,
  dealers: Dealers,
  sales: Sales,
  customers: Customers,
  b2bInvoices: B2BInvoices,
  biDashboard: BIDashboard,
  demandAnalysis: DemandAnalysis,
  forecasts: Forecasts,
  factoryOrders: FactoryOrders,
  factoryOrdersAdmin: FactoryOrdersAdmin,
  scheduledFollowUps: ScheduledFollowUps,
  reports: Reports,
}

const currentPageComponent = computed(() => {
  return pages[uiStore.currentPage] || Dashboard // Default to Dashboard
})
</script>

<style>
/* Using a global style for simplicity, but this could be moved to a separate CSS file */
body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
</style>
