<template>
  <textarea
    v-model="inputField"
    ref="textarea"
    class="terminal-input"
    v-show="visible"
    @keydown="handleKeydown"
    :placeholder="placeholder"
  />
</template>

<script>
import { defineComponent } from 'vue';
import { useTerminalInput } from '../../composables/useTerminalInput.js';

export default defineComponent({
  name: 'TerminalInput',
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['input-submitted'],
  setup(props, { emit }) {
    const {
      inputField,
      inputState,
      loadInputHistory,
      handleKeydown: originalHandleKeydown,
      submitInput,
    } = useTerminalInput();

    const handleKeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        const input = submitInput();
        if (input) {
          emit('input-submitted', input);
        }
      } else {
        originalHandleKeydown(event);
      }
    };

    // Load history on mount
    loadInputHistory();

    return {
      inputField,
      inputState,
      handleKeydown,
    };
  },
});
</script>

<style scoped>
.terminal-input {
  width: 100%;
  min-height: 100px;
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  resize: vertical;
}

.terminal-input:focus {
  outline: none;
}
</style>
