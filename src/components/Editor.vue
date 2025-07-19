<template>
  <div class="editor-container">
    <EditorToolbar
      :title="title"
      :current-language="currentLanguage"
      @open-file="openFile"
      @save-file="saveToFile"
      @submit-to-server="submitToServer"
      @language-changed="switchLanguage"
    />
    
    <!-- Header info section for code editing session -->
    <div 
      v-if="codeEditSession && codeEditSession.active" 
      id="editor-header-info" 
      :style="{ height: headerHeight + 'px' }"
    >
      <div v-for="(line, index) in codeEditSession.headerData" :key="index">
        {{ line }}
      </div>
    </div>
    
    <!-- Save command input for code editing session -->
    <input 
      v-if="codeEditSession && codeEditSession.active"
      id="progstart-input" 
      type="text" 
      v-model="codeEditSession.saveCommand"
      placeholder="Save command"
    />
    
    <!-- Resize handle -->
    <div 
      v-if="codeEditSession && codeEditSession.active" 
      id="resizeHandle"
      @mousedown="startResize"
    ></div>
    
    <!-- Monaco Editor -->
    <MonacoEditorWrapper
      ref="monacoEditorRef"
      v-model:value="editorContent"
      :language="currentLanguage"
      :height="editorHeight"
      @editor-ready="onEditorReady"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue';
import EditorToolbar from './editor/EditorToolbar.vue';
import MonacoEditorWrapper from './editor/MonacoEditorWrapper.vue';
import { useMonacoEditor } from '../composables/useMonacoEditor.js';
import { useCodeEditSession } from '../composables/useCodeEditSession.js';

export default {
  name: 'Editor',
  components: {
    EditorToolbar,
    MonacoEditorWrapper,
  },
  setup() {
    const {
      currentLanguage,
      title,
      openFile,
      saveToFile,
      submitToServer: baseSubmitToServer,
      switchLanguage,
      loadLanguagePreference,
    } = useMonacoEditor();

    const { codeEditSession, startCodeEditSession, getCodeContent, setCodeContent } = useCodeEditSession();
    
    const editorContent = ref('');
    const headerHeight = ref(100);
    const isResizing = ref(false);
    const monacoEditorRef = ref(null);

    // Wrapper function to pass codeEditSession to submitToServer
    const submitToServer = () => {
      baseSubmitToServer(codeEditSession.value);
    };

    const editorHeight = computed(() => {
      const baseHeight = (codeEditSession.value && codeEditSession.value.active) ? 'calc(100vh - 200px)' : 'calc(100vh - 50px)';
      return baseHeight;
    });

    const startResize = (event) => {
      isResizing.value = true;
      const startY = event.clientY;
      const startHeight = headerHeight.value;

      const handleMouseMove = (e) => {
        if (isResizing.value) {
          headerHeight.value = Math.max(50, startHeight + (e.clientY - startY));
        }
      };

      const handleMouseUp = () => {
        isResizing.value = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const onEditorReady = (editorInstance) => {
      // Editor is ready, can perform additional setup if needed
      console.log('Vue Monaco Editor ready:', editorInstance);
    };

    const setupEventListeners = () => {
      // Listen for code editor requests from the main process
      window.api.on('open-code-editor', (event, payload) => {
        console.log('Code editor opened with payload:', payload);
        
        // Set up the code editing session
        startCodeEditSession(payload);
        
        // Set the editor content from the code lines
        if (Array.isArray(payload.codeLines)) {
          const content = payload.codeLines.join('\n');
          console.log('Setting editor content:', content.length, 'characters');
          
          // Simply set the content via reactive binding
          editorContent.value = content;
        }
        
        // Update the title to show what we're editing
        title.value = `Editing: ${payload.saveCommand}`;
      });

      // Listen for editor updates
      window.api.on('update-editor', (event, data) => {
        if (typeof data === 'string') {
          // Append to existing content
          editorContent.value = editorContent.value + data;
        } else if (data && data.content) {
          // Replace entire content
          editorContent.value = data.content;
        }
      });
    };

    onMounted(() => {
      loadLanguagePreference();
      setupEventListeners();
    });

    return {
      currentLanguage,
      title,
      editorContent,
      headerHeight,
      editorHeight,
      codeEditSession,
      monacoEditorRef,
      openFile,
      saveToFile,
      submitToServer,
      switchLanguage,
      startResize,
      onEditorReady,
    };
  },
};
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
}

#editor-header-info {
  background: #2d2d30;
  color: #cccccc;
  padding: 10px;
  border-bottom: 1px solid #3e3e42;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

#progstart-input {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #cccccc;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
}

#progstart-input:focus {
  outline: none;
  border-color: #007acc;
}

#resizeHandle {
  height: 5px;
  background: #3e3e42;
  cursor: ns-resize;
  border-top: 1px solid #555;
  border-bottom: 1px solid #555;
}

#resizeHandle:hover {
  background: #007acc;
}
</style>
