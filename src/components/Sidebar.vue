<template>
  <div class="w-64 bg-gray-800 text-white flex flex-col min-h-screen">
    <div class="p-4 text-2xl font-bold border-b border-gray-700">Concesionario</div>
    <nav class="flex-1 p-2">
      <a
        v-for="link in visibleLinks"
        :key="link.page"
        href="#"
        @click.prevent="uiStore.setCurrentPage(link.page)"
        class="block py-2.5 px-4 rounded"
        :class="{ 'bg-gray-700': uiStore.currentPage === link.page, 'hover:bg-gray-700': uiStore.currentPage !== link.page }"
      >
        {{ link.name }}
      </a>
    </nav>
    <div class="p-4 border-t border-gray-700">
      <button @click="authStore.logout()" class="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Cerrar Sesión
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()

const navLinks = [
    { name: 'Dashboard', page: 'dashboard', roles: ['admin', 'factory', 'dealer'] },
    { name: 'Vehículos', page: 'vehicles', roles: ['admin', 'factory', 'dealer'] },
    { name: 'Concesionarios', page: 'dealers', roles: ['admin', 'factory'] },
    { name: 'Facturación B2B', page: 'b2bInvoices', roles: ['admin', 'factory'] },
    { name: 'Análisis BI', page: 'biDashboard', roles: ['admin', 'factory'] },
    { name: 'Análisis de Demanda', page: 'demandAnalysis', roles: ['factory'] },
    { name: 'Pronósticos', page: 'forecasts', roles: ['admin', 'factory'] },
    { name: 'Clientes', page: 'customers', roles: ['admin', 'dealer'] },
    { name: 'Ventas', page: 'sales', roles: ['admin', 'dealer'] },
    { name: 'Pedidos de Fábrica', page: 'factoryOrders', roles: ['dealer'] },
    { name: 'Gestión de Pedidos', page: 'factoryOrdersAdmin', roles: ['admin', 'factory'] },
    { name: 'Seguimientos', page: 'scheduledFollowUps', roles: ['admin', 'dealer'] },
    { name: 'Reportes', page: 'reports', roles: ['admin'] },
]

const visibleLinks = computed(() => {
  if (!authStore.role) return []
  return navLinks.filter(link => link.roles.includes(authStore.role))
})
</script>
