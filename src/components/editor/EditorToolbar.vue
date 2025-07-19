<template>
  <div id="monaco-editor-toolbar" class="editor-toolbar">
    <button @click="$emit('open-file')" id="load" title="Open File">
      <i class="fas fa-folder-open"></i>
    </button>
    <button @click="$emit('save-file')" id="save" title="Save File">
      <i class="fas fa-save"></i>
    </button>
    <button @click="$emit('submit-to-server')" id="submit" title="Submit to Server">
      <i class="fas fa-paper-plane"></i>
    </button>
    
    <select 
      @change="$emit('language-changed', $event.target.value)" 
      id="language-selector" 
      :value="currentLanguage"
      class="language-selector"
    >
      <option value="moocode">MOOCode</option>
      <option value="csharp">C#</option>
    </select>
    
    <div class="ms-auto">
      <span id="editor-title" class="editor-title">{{ title }}</span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'EditorToolbar',
  props: {
    title: {
      type: String,
      default: 'Code Editor',
    },
    currentLanguage: {
      type: String,
      default: 'moocode',
    },
  },
  emits: ['open-file', 'save-file', 'submit-to-server', 'language-changed'],
});
</script>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.editor-toolbar button {
  background: #007acc;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
}

.editor-toolbar button:hover {
  background: #005a9e;
}

.language-selector {
  background: #3c3c3c;
  border: 1px solid #555;
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
}

.editor-title {
  color: #cccccc;
  font-weight: 500;
}

.ms-auto {
  margin-left: auto;
}
</style>
