<template>
  <form @submit.prevent="handleSave" class="space-y-4">
    <div v-if="notification.message" :class="notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'" class="p-3 rounded">
      {{ notification.message }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input v-model="formData.name" placeholder="Nombre Completo" class="border p-2 rounded w-full md:col-span-2" required />
      <input v-model="formData.dni" placeholder="DNI / Identificación" class="border p-2 rounded w-full" required />
      <input v-model="formData.phone" placeholder="Teléfono" class="border p-2 rounded w-full" />
      <input v-model="formData.email" type="email" placeholder="Email" class="border p-2 rounded w-full md:col-span-2" />
      <textarea v-model="formData.address" placeholder="Dirección" class="border p-2 rounded w-full md:col-span-2" rows="3"></textarea>
    </div>

    <div class="flex justify-end gap-4 pt-4">
      <button type="button" @click="$emit('close-modal')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
      <button type="submit" :disabled="isLoading" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300">
        {{ isLoading ? 'Guardando...' : 'Guardar Cliente' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'

const props = defineProps({
  customer: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close-modal'])

const functions = getFunctions()
const isLoading = ref(false)
const notification = ref({ message: '', type: '' })

const getInitialFormData = () => ({
  name: '',
  dni: '',
  phone: '',
  email: '',
  address: '',
  ...props.customer
})

const formData = ref(getInitialFormData())

watch(() => props.customer, () => {
  formData.value = getInitialFormData()
}, { deep: true })

async function handleSave() {
  isLoading.value = true
  notification.value = { message: '', type: '' }

  try {
    const saveCustomer = httpsCallable(functions, 'saveCustomer')

    const payload = {
      customerData: formData.value
    }
    if (props.customer && props.customer.id) {
      payload.customerId = props.customer.id
    }

    const result = await saveCustomer(payload)

    if (result.data.success) {
      notification.value = { message: result.data.message, type: 'success' }
      setTimeout(() => {
        emit('close-modal')
      }, 2000)
    } else {
      throw new Error(result.data.message || 'Ocurrió un error desconocido.')
    }
  } catch (error) {
    console.error("Error saving customer:", error)
    notification.value = { message: error.message, type: 'error' }
  } finally {
    isLoading.value = false
  }
}
</script>
