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
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Editar
              </button>
              <button
                v-if="authStore.role === 'admin'"
                @click="handleDeleteVehicle(vehicle.id)"
                class="text-red-600 hover:text-red-900 mr-4"
              >
                Eliminar
              </button>
              <select
                v-if="(authStore.role === 'admin' || authStore.role === 'factory') && vehicle.status === 'enFabrica'"
                @change="handleAssignDealer(vehicle.id, $event.target.value)"
                class="border p-1 rounded text-xs"
              >
                <option value="" disabled :selected="!vehicle.dealerId">Asignar...</option>
                <option v-for="dealer in dealerStore.items" :key="dealer.id" :value="dealer.id" :selected="vehicle.dealerId === dealer.id">
                  {{ dealer.name }}
                </option>
              </select>

              <button
                v-if="authStore.role === 'dealer' && vehicle.status === 'asignado'"
                @click="handleConfirmOrder(vehicle.id)"
                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
              >
                Confirmar Pedido
              </button>
              <button
                v-if="authStore.role === 'dealer' && vehicle.status === 'enTransito'"
                @click="handleReceiveVehicle(vehicle.id)"
                class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
              >
                Recibir Vehículo
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center p-8 text-gray-500">
        No se encontraron vehículos.
      </div>
    </div>

    <Modal v-model="uiStore.isModalOpen" :title="uiStore.modalTitle">
      <VehicleForm :vehicle="uiStore.editingItem" @close-modal="uiStore.closeModal()" />
    </Modal>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useVehicleStore } from '@/stores/vehicles'
import { useDealerStore } from '@/stores/dealers'
import { getFunctions, httpsCallable } from 'firebase/functions'
import Modal from '@/components/Modal.vue'
import VehicleForm from '@/components/VehicleForm.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const vehicleStore = useVehicleStore()
const dealerStore = useDealerStore()
const functions = getFunctions()

function openCreateVehicleModal() {
  uiStore.openModal('Añadir Nuevo Vehículo', null)
}

function openEditVehicleModal(vehicle) {
  uiStore.openModal('Editar Vehículo', vehicle)
}

async function handleAssignDealer(vehicleId, dealerId) {
  if (!dealerId) return
  try {
    const assignDealer = httpsCallable(functions, 'assignDealer')
    await assignDealer({ vehicleId, dealerId })
    // The UI will update automatically thanks to the real-time listener in the store.
    // We could add a notification here if desired.
  } catch (error) {
    console.error("Error assigning dealer:", error)
    // Handle error, e.g., show notification
  }
}

async function handleDeleteVehicle(vehicleId) {
  if (confirm('¿Estás seguro de que quieres eliminar este vehículo? Esta acción no se puede deshacer.')) {
    try {
      const deleteVehicle = httpsCallable(functions, 'deleteVehicle')
      await deleteVehicle({ vehicleId })
      // Optional: show success notification
    } catch (error) {
      console.error("Error deleting vehicle:", error)
      // Optional: show error notification
    }
  }
}

async function handleConfirmOrder(vehicleId) {
  if (confirm('¿Estás seguro de que quieres confirmar este pedido? El vehículo pasará a estado "En Tránsito".')) {
    try {
      const confirmOrder = httpsCallable(functions, 'handleConfirmOrder')
      await confirmOrder({ vehicleId })
    } catch (error) {
      console.error("Error confirming order:", error)
    }
  }
}

async function handleReceiveVehicle(vehicleId) {
  if (confirm('¿Estás seguro de que quieres marcar este vehículo como recibido?')) {
    try {
      const receiveVehicle = httpsCallable(functions, 'receiveVehicle')
      await receiveVehicle({ vehicleId })
    } catch (error) {
      console.error("Error receiving vehicle:", error)
    }
  }
}
</script>
