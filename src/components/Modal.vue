<template>
  <div v-if="modelValue" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" @click.self="close">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-800">{{ title }}</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-800 font-bold text-2xl">&times;</button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: 'Modal Title',
  },
})

const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
}
</script>
