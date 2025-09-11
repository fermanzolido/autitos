<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Historial de Ventas</h1>
      <button
        v-if="authStore.role === 'dealer'"
        @click="openRegisterSaleModal"
        class="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600"
      >
        Registrar Venta
      </button>
    </div>

    <!-- Sales Table -->
    <div class="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <div v-if="saleStore.loading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <table v-else-if="saleStore.items.length > 0" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehículo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Final</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="sale in saleStore.items" :key="sale.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ sale.saleDate?.toDate().toLocaleDateString() || 'N/A' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ getVehicleInfo(sale.vehicleId) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ getCustomerInfo(sale.customerId) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">${{ (sale.finalPrice || 0).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center p-8 text-gray-500">
        No se encontraron ventas.
      </div>
    </div>

    <Modal :is-open="uiStore.isModalOpen" @close="uiStore.closeModal()">
      <h2 class="text-2xl font-bold mb-4">{{ uiStore.modalTitle }}</h2>
      <!-- A more advanced SaleForm would be needed to handle customer/vehicle selection -->
      <p class="text-center p-4">El formulario de registro de ventas se implementará con más detalle, incluyendo la selección de vehículos y clientes disponibles.</p>
    </Modal>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useSaleStore } from '@/stores/sales'
import { useVehicleStore } from '@/stores/vehicles'
import { useCustomerStore } from '@/stores/customers'
import Modal from '@/components/Modal.vue'
// import SaleForm from '@/components/SaleForm.vue' // To be used later

const authStore = useAuthStore()
const uiStore = useUiStore()
const saleStore = useSaleStore()
const vehicleStore = useVehicleStore()
const customerStore = useCustomerStore()

function getVehicleInfo(vehicleId) {
    const vehicle = vehicleStore.items.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.vin})` : 'N/A'
}

function getCustomerInfo(customerId) {
    const customer = customerStore.items.find(c => c.id === customerId)
    return customer ? customer.name : 'N/A'
}

function openRegisterSaleModal() {
  uiStore.openModal('Registrar Nueva Venta', null)
}
</script>
