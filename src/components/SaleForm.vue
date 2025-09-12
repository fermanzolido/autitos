<template>
  <form @submit.prevent="handleSave" class="space-y-4">
    <div v-if="notification.message" :class="notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'" class="p-3 rounded">
      {{ notification.message }}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Vehículo</label>
      <select v-model="formData.vehicleId" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>
          <option value="" disabled>Seleccione un vehículo</option>
          <option v-for="vehicle in availableVehicleStore.items" :key="vehicle.id" :value="vehicle.id">
            {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.vin }})
          </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Cliente</label>
      <select v-model="formData.customerId" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>
          <option value="" disabled>Seleccione un cliente</option>
          <option v-for="customer in customerStore.items" :key="customer.id" :value="customer.id">
            {{ customer.name }} ({{ customer.dni }})
          </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Precio Final</label>
      <input v-model="formData.finalPrice" type="number" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required/>
    </div>

    <div class="flex justify-end gap-4 pt-4">
      <button type="button" @click="$emit('close-modal')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
      <button type="submit" :disabled="isLoading" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300">
        {{ isLoading ? 'Guardando...' : 'Registrar Venta' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAvailableVehicleStore } from '@/stores/availableVehicles'
import { useCustomerStore } from '@/stores/customers'

const availableVehicleStore = useAvailableVehicleStore()
const customerStore = useCustomerStore()

const props = defineProps({
  sale: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close-modal'])

const functions = getFunctions()
const isLoading = ref(false)
const notification = ref({ message: '', type: '' })

const getInitialFormData = () => ({
  vehicleId: '',
  customerId: '',
  finalPrice: null,
  ...props.sale
})

const formData = ref(getInitialFormData())

watch(() => props.sale, () => {
  formData.value = getInitialFormData()
}, { deep: true })

async function handleSave() {
  isLoading.value = true
  notification.value = { message: '', type: '' }

  try {
    const registerSale = httpsCallable(functions, 'registerSale')

    const payload = {
      salePayload: formData.value
    }

    const result = await registerSale(payload)

    if (result.data.success) {
      notification.value = { message: result.data.message, type: 'success' }
      setTimeout(() => {
        emit('close-modal')
      }, 2000)
    } else {
      throw new Error(result.data.message || 'Ocurrió un error desconocido.')
    }
  } catch (error) {
    console.error("Error registering sale:", error)
    notification.value = { message: error.message, type: 'error' }
  } finally {
    isLoading.value = false
  }
}
</script>
