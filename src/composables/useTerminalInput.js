/**
 * Composable for handling terminal input operations
 * Manages input history, keyboard navigation, and command processing
 */
import { ref, reactive } from 'vue';

export function useTerminalInput() {
  const inputField = ref('');
  const inputState = reactive({
    history: [],
    currentIndex: -1,
  });

  const loadInputHistory = async () => {
    try {
      const savedHistory = await window.store.get('inputHistory');
      // Handle both array format and object format (legacy support)
      if (Array.isArray(savedHistory)) {
        inputState.history = savedHistory;
      } else if (savedHistory && typeof savedHistory === 'object') {
        // Convert object with numeric keys to array (legacy format)
        inputState.history = Object.values(savedHistory);
      } else {
        inputState.history = [];
      }
      inputState.currentIndex = inputState.history.length;
      console.log('Loaded input history:', inputState.history.length, 'entries');
    } catch (error) {
      console.warn('Failed to load input history:', error);
      inputState.history = [];
      inputState.currentIndex = 0;
    }
  };

  const saveInputHistory = async () => {
    try {
      // Save as array format for Vue 3
      await window.store.set('inputHistory', inputState.history);
      console.log('Saved input history:', inputState.history.length, 'entries');
    } catch (error) {
      console.warn('Failed to save input history:', error);
    }
  };

  const addToHistory = (input) => {
    if (input.trim()) {
      inputState.history.push(input.trim());
      inputState.currentIndex = inputState.history.length;
      saveInputHistory();
    }
  };

  const navigateHistory = (direction) => {
    if (direction === 'up' && inputState.currentIndex > 0) {
      inputState.currentIndex--;
      inputField.value = inputState.history[inputState.currentIndex] || '';
    } else if (direction === 'down') {
      if (inputState.currentIndex < inputState.history.length - 1) {
        inputState.currentIndex++;
        inputField.value = inputState.history[inputState.currentIndex] || '';
      } else {
        inputState.currentIndex = inputState.history.length;
        inputField.value = '';
      }
    }
  };

  const submitInput = () => {
    const input = inputField.value.trim();
    if (input) {
      addToHistory(input);
      window.api.write(input);
      inputField.value = '';
      return input;
    }
    return null;
  };

  const handleKeydown = (event) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        return; // Allow shift+enter for new lines
      }
      event.preventDefault();
      submitInput();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      navigateHistory('up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      navigateHistory('down');
    }
  };

  return {
    inputField,
    inputState,
    loadInputHistory,
    addToHistory,
    navigateHistory,
    submitInput,
    handleKeydown,
  };
}
