<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h2>
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
          <input v-model="email" id="email" type="email" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2" for="password">Contraseña</label>
          <input v-model="password" id="password" type="password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <button id="login-button" type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-blue-300" :disabled="loading">
          {{ loading ? 'Iniciando...' : 'Iniciar Sesión' }}
        </button>
        <p v-if="error" class="text-red-500 text-xs italic mt-4">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)

const authStore = useAuthStore()

const handleLogin = async () => {
  loading.value = true
  error.value = null
  try {
    await authStore.login(email.value, password.value)
    // The onAuthStateChanged listener in the store will handle the redirect
  } catch (err) {
    error.value = 'Credenciales inválidas o error de red.'
    console.error("Error de inicio de sesión:", err)
  } finally {
    loading.value = false
  }
}
</script>
