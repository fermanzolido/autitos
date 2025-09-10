import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
    const currentPage = ref('dashboard')

    function setCurrentPage(page) {
        currentPage.value = page
    }

    return { currentPage, setCurrentPage }
})
