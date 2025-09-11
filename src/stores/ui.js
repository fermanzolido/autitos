import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
    const currentPage = ref('dashboard')
    const isModalOpen = ref(false)
    const modalTitle = ref('')
    const editingItem = ref(null)

    function setCurrentPage(page) {
        currentPage.value = page
    }

    function openModal(title, item = null) {
        modalTitle.value = title
        editingItem.value = item
        isModalOpen.value = true
    }

    function closeModal() {
        isModalOpen.value = false
        modalTitle.value = ''
        editingItem.value = null
    }

    return {
        currentPage,
        setCurrentPage,
        isModalOpen,
        modalTitle,
        editingItem,
        openModal,
        closeModal
    }
})
