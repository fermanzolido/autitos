<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Gestión de Concesionarios</h1>
      <button
        v-if="authStore.role === 'admin'"
        @click="openCreateDealerModal"
        class="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
      >
        Añadir Concesionario
      </button>
    </div>

    <!-- Dealers Table -->
    <div class="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <div v-if="dealerStore.loading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <table v-else-if="dealerStore.items.length > 0" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Territorio</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Línea de Crédito</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crédito Disponible</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="dealer in dealerStore.items" :key="dealer.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ dealer.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ dealer.territory }}</td>
            <td class="px-6 py-4 whitespace-nowrap">${{ (dealer.creditLine || 0).toLocaleString() }}</td>
            <td class="px-6 py-4 whitespace-nowrap">${{ (dealer.availableCredit || 0).toLocaleString() }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                v-if="authStore.role === 'admin'"
                @click="openEditDealerModal(dealer)"
                class="text-indigo-600 hover:text-indigo-900"
              >
                Editar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center p-8 text-gray-500">
        No se encontraron concesionarios.
      </div>
    </div>

    <Modal :is-open="uiStore.isModalOpen" @close="uiStore.closeModal()">
      <h2 class="text-2xl font-bold mb-4">{{ uiStore.modalTitle }}</h2>
      <DealerForm :dealer="uiStore.editingItem" @close-modal="uiStore.closeModal()" />
    </Modal>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useDealerStore } from '@/stores/dealers'
import Modal from '@/components/Modal.vue'
import DealerForm from '@/components/DealerForm.vue'

const authStore = useAuthStore()
const uiStore = useUiStore()
const dealerStore = useDealerStore()

function openCreateDealerModal() {
  uiStore.openModal('Añadir Nuevo Concesionario', null)
}

function openEditDealerModal(dealer) {
  uiStore.openModal('Editar Concesionario', dealer)
}
</script>
