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

    <!-- Placeholder for filters and table -->
    <div class="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <p class="text-gray-500">La tabla de vehículos y los filtros se implementarán aquí.</p>
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
import Modal from '@/components/Modal.vue'
import VehicleForm from '@/components/VehicleForm.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()

function openCreateVehicleModal() {
  uiStore.openModal('Añadir Nuevo Vehículo', null)
}
</script>
