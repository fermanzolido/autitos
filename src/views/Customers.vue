<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
      <button
        @click="openCreateCustomerModal"
        class="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
      >
        Añadir Cliente
      </button>
    </div>

    <!-- Customers Table -->
    <div class="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <div v-if="customerStore.loading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <table v-else-if="customerStore.items.length > 0" class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="customer in customerStore.items" :key="customer.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ customer.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ customer.dni }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ customer.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ customer.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="openEditCustomerModal(customer)"
                class="text-indigo-600 hover:text-indigo-900"
              >
                Editar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-center p-8 text-gray-500">
        No se encontraron clientes.
      </div>
    </div>

    <Modal v-model="uiStore.isModalOpen" :title="uiStore.modalTitle">
      <CustomerForm :customer="uiStore.editingItem" @close-modal="uiStore.closeModal()" />
    </Modal>
  </div>
</template>

<script setup>
import { useUiStore } from '@/stores/ui'
import { useCustomerStore } from '@/stores/customers'
import Modal from '@/components/Modal.vue'
import CustomerForm from '@/components/CustomerForm.vue'

const uiStore = useUiStore()
const customerStore = useCustomerStore()

function openCreateCustomerModal() {
  uiStore.openModal('Añadir Nuevo Cliente', null)
}

function openEditCustomerModal(customer) {
  uiStore.openModal('Editar Cliente', customer)
}
</script>
