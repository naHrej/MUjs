<template>
  <div 
    ref="terminalDisplay" 
    class="terminal-display"
    v-show="visible"
    @click="handleClick"
  />
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import { terminalUtils } from '../../utils/components/terminalUtils.js';

export default defineComponent({
  name: 'TerminalDisplay',
  props: {
    visible: {
      type: Boolean,
      default: true,
    },
    ansiEnabled: {
      type: Boolean,
      default: false,
    },
    htmlEnabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['command-clicked'],
  setup(props, { emit }) {
    const terminalDisplay = ref(null);

    const appendContent = (content, type = 'text') => {
      if (!terminalDisplay.value) return;

      let processedContent = content;
      
      if (type === 'text') {
        processedContent = terminalUtils.processAnsiText(content, props.ansiEnabled);
      } else if (type === 'html' && props.htmlEnabled) {
        processedContent = content;
      } else {
        processedContent = terminalUtils.stripAnsiCodes(content);
      }

      const element = document.createElement('div');
      element.innerHTML = processedContent;
      terminalDisplay.value.appendChild(element);
      
      // Auto-scroll to bottom
      terminalDisplay.value.scrollTop = terminalDisplay.value.scrollHeight;
    };

    const clearContent = () => {
      if (terminalDisplay.value) {
        terminalDisplay.value.innerHTML = '';
      }
    };

    const handleClick = (event) => {
      const target = event.target;
      if (target.hasAttribute('onCommand')) {
        const command = target.getAttribute('onCommand');
        emit('command-clicked', command);
      }
    };

    const scrollToBottom = () => {
      if (terminalDisplay.value) {
        terminalDisplay.value.scrollTop = terminalDisplay.value.scrollHeight;
      }
    };

    return {
      terminalDisplay,
      appendContent,
      clearContent,
      handleClick,
      scrollToBottom,
    };
  },
});
</script>

<style scoped>
.terminal-display {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.terminal-display::-webkit-scrollbar {
  width: 8px;
}

.terminal-display::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.terminal-display::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}
</style>
