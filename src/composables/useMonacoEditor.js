/**
 * Composable for Monaco Editor operations
 * Handles editor instance, language configuration, and file operations
 */
import { ref, onMounted, onUnmounted } from 'vue';
import * as monaco from 'monaco-editor';

export function useMonacoEditor() {
  const editorContainer = ref(null);
  const editor = ref(null);
  const currentLanguage = ref('moocode');
  const title = ref('Code Editor');

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await window.store.get('editor.language');
      if (savedLanguage) {
        currentLanguage.value = savedLanguage;
      }
    } catch (error) {
      console.warn('Failed to load language preference:', error);
    }
  };

  const saveLanguagePreference = async (language) => {
    try {
      await window.store.set('editor.language', language);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  };

  const initializeEditor = () => {
    if (!editorContainer.value) return;

    editor.value = monaco.editor.create(editorContainer.value, {
      value: '',
      language: currentLanguage.value,
      theme: 'vs-dark',
      automaticLayout: true,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      fontSize: 14,
      wordWrap: 'on',
    });
  };

  const switchLanguage = async (language) => {
    currentLanguage.value = language;
    await saveLanguagePreference(language);
    
    if (editor.value) {
      monaco.editor.setModelLanguage(editor.value.getModel(), language);
    }
  };

  const setEditorContent = (content) => {
    if (editor.value) {
      editor.value.setValue(content);
    }
  };

  const getEditorContent = () => {
    return editor.value ? editor.value.getValue() : '';
  };

  const setTitle = (newTitle) => {
    title.value = newTitle;
  };

  const openFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.js,.moo,.cs,.c,.cpp,.h,.hpp,.py,.java,.rb,.php,.html,.css,.json,.xml,.sql';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEditorContent(e.target.result);
          setTitle(file.name);
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };

  const saveToFile = () => {
    const content = getEditorContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = title.value.endsWith('.') ? title.value : `${title.value}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const submitToServer = (codeEditSession) => {
    // If code editing session info is available, use it (like the original SubmitToServer)
    if (codeEditSession && codeEditSession.endMarker) {
      // Get the code from the editor (as array of lines)
      let code = getEditorContent();
      let codeLines = code.split(/\r?\n/);
      
      // Get the save command from the progstart input or session
      const progstartInput = document.getElementById('progstart-input');
      let saveCommand = progstartInput?.value || codeEditSession.saveCommand || '';
      
      // Compose the message to send back to the server as a single string
      let message = [
        saveCommand,
        ...codeLines,
        codeEditSession.endMarker
      ].join('\n');
      
      console.debug('[SubmitToServer] Sending code block to server:', message);
      window.api.send("submit", message);
    } else {
      // Fallback: just send the editor contents
      console.debug('[SubmitToServer] No codeEditSession, sending editor contents.');
      const content = getEditorContent();
      if (content.trim()) {
        window.api.send("submit", content);
      }
    }
  };

  onMounted(() => {
    loadLanguagePreference();
  });

  onUnmounted(() => {
    if (editor.value) {
      editor.value.dispose();
    }
  });

  return {
    editorContainer,
    editor,
    currentLanguage,
    title,
    initializeEditor,
    switchLanguage,
    setEditorContent,
    getEditorContent,
    setTitle,
    openFile,
    saveToFile,
    submitToServer,
    loadLanguagePreference,
  };
}
