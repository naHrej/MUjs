/**
 * Composable for managing code editing sessions
 * Handles code editor state, protocols, and server communication
 */
import { reactive } from 'vue';

export function useCodeEditSession() {
  const codeEditSession = reactive({
    active: false,
    saveCommand: '',
    headerData: [],
    codeLines: [],
    endMarker: '',
  });

  const startCodeEditSession = (data) => {
    codeEditSession.active = true;
    codeEditSession.saveCommand = data.saveCommand || '';
    codeEditSession.headerData = data.headerData || [];
    codeEditSession.codeLines = data.codeLines || [];
    codeEditSession.endMarker = data.endMarker || '';
  };

  const endCodeEditSession = () => {
    codeEditSession.active = false;
    codeEditSession.saveCommand = '';
    codeEditSession.headerData = [];
    codeEditSession.codeLines = [];
    codeEditSession.endMarker = '';
  };

  const updateCodeLines = (lines) => {
    codeEditSession.codeLines = lines;
  };

  const getCodeContent = () => {
    return codeEditSession.codeLines.join('\n');
  };

  const setCodeContent = (content) => {
    codeEditSession.codeLines = content.split('\n');
  };

  return {
    codeEditSession,
    startCodeEditSession,
    endCodeEditSession,
    updateCodeLines,
    getCodeContent,
    setCodeContent,
  };
}
