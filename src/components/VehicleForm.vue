<template>
  <form @submit.prevent="saveVehicle" class="space-y-4">
    <input name="make" v-model="formData.make" placeholder="Marca" class="border p-2 rounded w-full" />
    <input name="model" v-model="formData.model" placeholder="Modelo" class="border p-2 rounded w-full" />
    <input name="trim" v-model="formData.trim" placeholder="Nivel de Equipamiento (Trim)" class="border p-2 rounded w-full" />
    <input name="vin" v-model="formData.vin" placeholder="VIN" class="border p-2 rounded w-full" />
    <input name="color" v-model="formData.color" placeholder="Color" class="border p-2 rounded w-full" />
    <input name="price" type="number" v-model="formData.price" placeholder="Precio" class="border p-2 rounded w-full" />
    <div class="flex justify-end gap-4">
      <button type="button" @click="emit('close')" class="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
      <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Guardar</button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  vehicle: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close', 'save'])

const formData = ref({ ...props.vehicle })

watch(() => props.vehicle, (newVehicle) => {
  formData.value = { ...newVehicle }
})

const saveVehicle = () => {
  // Emit the save event with the form data
  emit('save', formData.value)
}
</script>
