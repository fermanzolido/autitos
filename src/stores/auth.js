import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const role = ref(null)
  const userClaims = ref(null)
  const authLoading = ref(true)

  const auth = getAuth()

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const idTokenResult = await firebaseUser.getIdTokenResult(true)
      user.value = firebaseUser
      role.value = idTokenResult.claims.role || null
      userClaims.value = idTokenResult.claims
    } else {
      user.value = null
      role.value = null
      userClaims.value = null
    }
    authLoading.value = false
  })

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, role, userClaims, authLoading, login, logout }
})
