<template>
  <form @submit.prevent="handleSave" class="space-y-4">
    <div v-if="notification.message" :class="notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'" class="p-3 rounded">
      {{ notification.message }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input v-model="formData.name" placeholder="Nombre del Concesionario" class="border p-2 rounded w-full md:col-span-2" required />
      <input v-model="formData.address" placeholder="Dirección" class="border p-2 rounded w-full md:col-span-2" />
      <input v-model="formData.territory" placeholder="Territorio" class="border p-2 rounded w-full" />
      <input v-model="formData.creditLine" type="number" placeholder="Línea de Crédito" class="border p-2 rounded w-full" />
    </div>

    <div class="flex justify-end gap-4 pt-4">
      <button type="button" @click="$emit('close-modal')" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
      <button type="submit" :disabled="isLoading" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300">
        {{ isLoading ? 'Guardando...' : 'Guardar Concesionario' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'

const props = defineProps({
  dealer: {
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
  address: '',
  territory: '',
  creditLine: null,
  ...props.dealer
})

const formData = ref(getInitialFormData())

watch(() => props.dealer, () => {
  formData.value = getInitialFormData()
}, { deep: true })

async function handleSave() {
  isLoading.value = true
  notification.value = { message: '', type: '' }

  try {
    const saveDealer = httpsCallable(functions, 'saveDealer')

    const payload = {
      dealerData: formData.value
    }
    if (props.dealer && props.dealer.id) {
      payload.dealerId = props.dealer.id
    }

    const result = await saveDealer(payload)

    if (result.data.success) {
      notification.value = { message: result.data.message, type: 'success' }
      setTimeout(() => {
        emit('close-modal')
      }, 2000)
    } else {
      throw new Error(result.data.message || 'Ocurrió un error desconocido.')
    }
  } catch (error) {
    console.error("Error saving dealer:", error)
    notification.value = { message: error.message, type: 'error' }
  } finally {
    isLoading.value = false
  }
}
</script>
