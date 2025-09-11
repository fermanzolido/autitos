<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Gestión de Vehículos</h1>
      <button
        v-if="authStore.role === 'admin' || authStore.role === 'factory'"
        @click="openCreateVehicleModal"
        class="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
      >
        Añadir Vehículo
      </button>
    </div>

    <!-- Vehicle Table -->
    <div class="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <div v-if="vehicleStore.loading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <table v-else-if="vehicleStore.items.length > 0" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Modelo</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN/Año</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="vehicle in vehicleStore.items" :key="vehicle.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ vehicle.make }} {{ vehicle.model }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ vehicle.vin }}<br/><span class="text-sm text-gray-500">{{ vehicle.year }}</span></td>
            <td class="px-6 py-4 whitespace-nowrap">{{ vehicle.exterior_color }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="{
                      'bg-red-100 text-red-800': vehicle.status === 'vendido',
                      'bg-green-100 text-green-800': vehicle.status === 'enConcesionario',
                      'bg-yellow-100 text-yellow-800': vehicle.status === 'enFabrica',
                      'bg-blue-100 text-blue-800': vehicle.status === 'enTransito' || vehicle.status === 'asignado',
                    }">
                {{ vehicle.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${{ (vehicle.price || 0).toLocaleString() }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="authStore.role === 'admin' || authStore.role === 'factory'"
                @click="openEditVehicleModal(vehicle)"
                class="text-indigo-600 hover:text-indigo-900"
              >
                Editar
              </button>
              <!-- More actions can be added here -->
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center p-8 text-gray-500">
        No se encontraron vehículos.
      </div>
    </div>

    <Modal :is-open="uiStore.isModalOpen" @close="uiStore.closeModal()">
      <h2 class="text-2xl font-bold mb-4">{{ uiStore.modalTitle }}</h2>
      <VehicleForm :vehicle="uiStore.editingItem" @close-modal="uiStore.closeModal()" />
    </Modal>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useVehicleStore } from '@/stores/vehicles'
import Modal from '@/components/Modal.vue'
import VehicleForm from '@/components/VehicleForm.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const vehicleStore = useVehicleStore()

function openCreateVehicleModal() {
  uiStore.openModal('Añadir Nuevo Vehículo', null)
}

function openEditVehicleModal(vehicle) {
  uiStore.openModal('Editar Vehículo', vehicle)
}
</script>
