import { ref, Ref, onMounted } from 'vue'
import { logger } from '../../shared/utils/logger'
import { waitForApi } from '../../shared/utils/waitForApi'

export function useInputHistory() {
  const inputHistory = ref<string[]>([])
  const currentInputIndex = ref(-1)

  onMounted(async () => {
    // Wait for window.store to be available
    try {
      await waitForApi()
    } catch (error) {
      logger.warn('Failed to wait for window.store, skipping input history load:', error)
      return
    }

    // Load input history
    try {
      const history = await window.store.get('inputHistory')
      if (history) {
        inputHistory.value = Object.values(history)
      }
    } catch (error) {
      logger.error('Error loading input history:', error)
    }
  })

  function addToHistory(command: string) {
    // Create a plain array copy before saving to avoid reactivity issues during serialization
    const historyToSave = [...inputHistory.value, command]
    inputHistory.value = historyToSave // Update reactive ref
    currentInputIndex.value = -1
    
    // Save input history
    if (window.store) {
      window.store.set('inputHistory', historyToSave).catch((err) => {
        logger.error('Error saving input history:', err)
      })
    } else {
      logger.warn('window.store is not available, cannot save input history')
    }
  }

  function navigateHistory(direction: 'up' | 'down'): string | null {
    if (direction === 'up') {
      if (currentInputIndex.value < inputHistory.value.length - 1) {
        currentInputIndex.value++
        return inputHistory.value[inputHistory.value.length - 1 - currentInputIndex.value]
      }
    } else {
      if (currentInputIndex.value > -1) {
        currentInputIndex.value--
        if (currentInputIndex.value === -1) {
          return ''
        } else {
          return inputHistory.value[inputHistory.value.length - 1 - currentInputIndex.value]
        }
      }
    }
    return null
  }

  function resetHistoryNavigation() {
    currentInputIndex.value = -1
  }

  return {
    inputHistory,
    currentInputIndex,
    addToHistory,
    navigateHistory,
    resetHistoryNavigation
  }
}
