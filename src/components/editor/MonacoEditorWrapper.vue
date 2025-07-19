<template>
  <vue-monaco-editor
    ref="editorRef"
    v-model:value="internalValue"
    :language="language"
    :height="height"
    :options="editorOptions"
    @mount="onEditorMount"
    @change="onContentChange"
  />
</template>

<script>
import { defineComponent, defineExpose, ref, computed, watch } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';

export default defineComponent({
  name: 'MonacoEditorWrapper',
  components: {
    VueMonacoEditor,
  },
  props: {
    value: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'moocode',
    },
    height: {
      type: String,
      default: '400px',
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:value', 'editor-ready'],
  setup(props, { emit }) {
    const editorRef = ref(null);
    const internalValue = ref(props.value);
    const isEditorReady = ref(false);
    const editorInstance = ref(null);

    const editorOptions = computed(() => ({
      theme: 'vs-dark',
      automaticLayout: true,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: props.readOnly,
      fontSize: 14,
      wordWrap: 'on',
    }));

    // Watch for external value changes
    watch(() => props.value, (newValue) => {
      if (newValue !== internalValue.value) {
        internalValue.value = newValue;
      }
    });

    const onEditorMount = (editor) => {
      console.log('Vue Monaco Editor mounted successfully');
      editorInstance.value = editor;
      isEditorReady.value = true;
      emit('editor-ready', editor);
    };

    const onContentChange = (value) => {
      emit('update:value', value);
    };

    // Expose methods to parent component
    const setContent = (content) => {
      if (isEditorReady.value && editorInstance.value) {
        internalValue.value = content;
        editorInstance.value.setValue(content);
        return true;
      }
      return false;
    };

    const getContent = () => {
      return isEditorReady.value && editorInstance.value ? editorInstance.value.getValue() : internalValue.value;
    };

    // Expose methods to parent component via template ref
    defineExpose({
      setContent,
      getContent,
      isReady: () => isEditorReady.value,
    });

    return {
      editorRef,
      internalValue,
      editorOptions,
      onEditorMount,
      onContentChange,
    };
  },
});
</script>

<style scoped>
/* Monaco editor will handle its own styling */
</style>
