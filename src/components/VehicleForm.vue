<template>
  <form @submit.prevent="handleSave" class="space-y-4">
    <div v-if="notification.message" :class="notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'" class="p-3 rounded">
      {{ notification.message }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input v-model="formData.vin" placeholder="VIN (Número de Identificación)" class="border p-2 rounded w-full md:col-span-2" required />
      <input v-model="formData.make" placeholder="Marca" class="border p-2 rounded w-full" required />
      <input v-model="formData.model" placeholder="Modelo" class="border p-2 rounded w-full" required />
      <input v-model="formData.version" placeholder="Versión / Trim" class="border p-2 rounded w-full" />
      <input v-model="formData.year" type="number" placeholder="Año" class="border p-2 rounded w-full" required />
      <input v-model="formData.exterior_color" placeholder="Color Exterior" class="border p-2 rounded w-full" />
      <input v-model="formData.interior_color" placeholder="Color Interior" class="border p-2 rounded w-full" />
      <textarea v-model="formData.extra_features" placeholder="Características y equipamiento extra (separado por comas)" class="border p-2 rounded w-full md:col-span-2" rows="3"></textarea>
      <input v-model="formData.price" type="number" placeholder="Precio Base" class="border p-2 rounded w-full md:col-span-2" />
    </div>

    <div class="flex justify-end gap-4 pt-4">
      <button type="button" @click="$emit('close-modal')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
      <button type="submit" :disabled="isLoading" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300">
        {{ isLoading ? 'Guardando...' : 'Guardar Vehículo' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'

const props = defineProps({
  vehicle: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close-modal'])

const functions = getFunctions()
const isLoading = ref(false)
const notification = ref({ message: '', type: '' })

const getInitialFormData = () => ({
  vin: '',
  make: '',
  model: '',
  version: '',
  year: '',
  exterior_color: '',
  interior_color: '',
  extra_features: '',
  price: null,
  ...props.vehicle
})

const formData = ref(getInitialFormData())

watch(() => props.vehicle, () => {
  formData.value = getInitialFormData()
}, { deep: true })

async function handleSave() {
  isLoading.value = true
  notification.value = { message: '', type: '' }

  try {
    const saveVehicle = httpsCallable(functions, 'saveVehicle')

    // The backend function expects the data in a specific format
    const payload = {
      vehicleData: formData.value
    }
    // If we are editing, we also need to pass the vehicleId
    if (props.vehicle && props.vehicle.id) {
      payload.vehicleId = props.vehicle.id
    }

    const result = await saveVehicle(payload)

    if (result.data.success) {
      notification.value = { message: result.data.message, type: 'success' }
      setTimeout(() => {
        emit('close-modal')
      }, 2000)
    } else {
      throw new Error(result.data.message || 'Ocurrió un error desconocido.')
    }
  } catch (error) {
    console.error("Error saving vehicle:", error)
    // Firebase callable functions wrap the error message in `error.message`
    notification.value = { message: error.message, type: 'error' }
  } finally {
    isLoading.value = false
  }
}
</script>
