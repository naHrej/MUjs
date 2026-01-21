<template>
  <div id="editor" class="mujs-editor">
    <Toolbar class="mujs-toolbar">
      <template #start>
        <div class="mujs-toolbar-left">
          <span class="mujs-toolbar-title">Editor</span>
          <Select
            v-model="currentLanguage"
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Language"
            class="mujs-language-select"
          />
        </div>
      </template>
      <template #end>
        <div class="mujs-toolbar-actions">
          <Button icon="pi pi-folder-open" rounded text aria-label="Load" v-tooltip.bottom="'Load'" @click="loadFromFile" />
          <Button icon="pi pi-save" rounded text aria-label="Save" v-tooltip.bottom="'Save'" @click="saveToFile" />
          <Button icon="pi pi-send" rounded severity="primary" aria-label="Submit" v-tooltip.bottom="'Submit'" @click="submitToServer" />
        </div>
      </template>
    </Toolbar>

    <Card class="mujs-header-card">
      <template #content>
        <div ref="headerInfoRef" class="mujs-header-info"></div>
        <div class="mujs-progstart-row">
          <InputText
            ref="progstartInputRef"
            placeholder="ProgStart command (optional)"
            class="mujs-progstart"
          />
        </div>
      </template>
    </Card>

    <div id="resizeHandle" ref="resizeHandleRef" class="mujs-resize-handle"></div>
    <div id="monaco-editor-moocode" ref="editorContainerRef" class="mujs-monaco"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Card from 'primevue/card'
import * as monaco from 'monaco-editor'
import type { CodeEditSession } from '../../shared/types/events'
import type { CodeEditPayload } from '../../shared/types/ipc'
import type { IpcRendererEvent } from 'electron'
import { waitForApi } from '../../shared/utils/waitForApi'
import { logger } from '../../shared/utils/logger'

const editorContainerRef = ref<HTMLElement | null>(null)
const headerInfoRef = ref<HTMLElement | null>(null)
const progstartInputRef = ref<HTMLInputElement | null>(null)
const resizeHandleRef = ref<HTMLElement | null>(null)

let editor: monaco.editor.IStandaloneCodeEditor | null = null
const currentLanguage = ref('moocode')
const languageOptions = [
  { label: 'MOOcode', value: 'moocode' },
  { label: 'C#', value: 'csharp' }
] as const
let atLineCount = 0
let codeEditSession: CodeEditSession | null = null

onMounted(async () => {
  try {
    await waitForApi()
  } catch (e) {
    logger.error('Editor: window.api/window.store not available', e)
    return
  }

  await initEditor()
  setupEventListeners()
  setupResizeHandle()
  
  // Load saved language preference
  const savedLanguage = await window.store.get('editorLanguage')
  if (savedLanguage && savedLanguage !== currentLanguage.value) {
    currentLanguage.value = savedLanguage
    switchLanguage(savedLanguage)
  }

      // Listen for code editor open event
      window.api.on('open-code-editor', (_event: IpcRendererEvent, payload: CodeEditPayload) => {
        handleOpenCodeEditor(payload)
      })

      // Listen for editor updates
      window.api.on('update-editor', (_event: IpcRendererEvent, data: string) => {
    if (editor) {
      editor.setValue(editor.getValue() + data)
    }
  })

  // Handle keyboard shortcuts
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
  window.removeEventListener('keydown', handleKeydown)
})

watch(currentLanguage, (newLang) => {
  switchLanguage(newLang)
})

async function initEditor() {
  if (!editorContainerRef.value) return

  // Register MOOcode language
  monaco.languages.register({ id: 'moocode' })

  // Set up MOOcode tokenizer (full version)
  monaco.languages.setMonarchTokensProvider('moocode', {
    tokenizer: {
      root: [
        [/(\/\/|@@).*$/, 'comment'],
        [/^@(program|args|verb)\b/, 'markup.heading'],
        [/[\.,`\'@=><!~?:&|+\-*\/\^%]+/, 'operators'],
        [/[;]+/, 'operators.semicolon'],
        [/(#\d+)/, 'object'],
        [/(\d+)/, 'number'],
        [/\b(E_NONE|E_TYPE|E_DIV|E_PERM|E_PROPNF|E_VERBNF|E_VARNF|E_INVIND|E_RECMOVE|E_MAXREC|E_RANGE|E_ARGS|E_NACC|E_INVARG|E_QUOTA|E_FLOAT|E_FILE|E_EXEC|E_INTRPT)\b/, 'constant.error'],
        [/\b(if|while|for|in|this|try|except)\b/, 'keyword.control'],
        [/\b(return|endif|endwhile|endfor|else|elseif|finally|endtry)\b/, 'keyword.control.end'],
        [/\b(abs|acos|add_property|add_verb|asin|atan|binary_hash|boot_player|buffered_output_length|call_function|caller_perms|callers|ceil|children|chparent|clear_property|connected_players|connected_seconds|connection_name|connection_option|connection_options|cos|cosh|create|crypt|ctime|db_disk_size|decode_binary|delete_property|delete_verb|disassemble|dump_database|encode_binary|equal|eval|exp|floatstr|floor|flush_input|force_input|function_info|idle_seconds|index|is_clear_property|is_member|is_player|kill_task|length|listappend|listdelete|listen|listeners|listinsert|listset|load_server_options|log|log10|log_cache_stats|match|max|max_object|memory_usage|min|move|notify|object_bytes|open_network_connection|output_delimiters|parent|pass|players|properties|property_info|queue_info|queued_tasks|raise|random|read|recycle|renumber|reset_max_object|resume|rindex|rmatch|seconds_left|server_log|server_version|set_connection_option|set_player_flag|set_property_info|set_task_perms|set_verb_args|set_verb_code|set_verb_info|setadd|setremove|shutdown|sin|sinh|sqrt|strcmp|string_hash|strsub|substitute|suspend|tan|tanh|task_id|task_stack|ticks_left|time|tofloat|toint|toliteral|tonum|toobj|tostr|trunc|typeof|unlisten|valid|value_bytes|value_hash|verb_args|verb_cache_stats|verb_code|verb_info|verbs)\b/, 'keyword.function'],
        [/\b(verb|args|argspec|obj|objspec|dobj|dobjspec|iobj|iobjspec)\b/, 'keyword.params'],
        [/\b(INT|NUM|FLOAT|LIST|MAP|STR|ANON|OBJ|ERR|ANY)\b/, 'constant.numeric'],
        [/(\$\w+)([:])(\w+)/, ['objectref', 'delimiter', 'verb']],
        [/(\$\w+)([.])(\w+)/, ['objectref', 'delimiter', 'property']],
        [/(\w+)([:])(\w+)\b/, ['object', 'delimiter', 'verb']],
        [/(\w+)([.])(\w+)\b/, ['object', 'delimiter', 'property']],
        [/\$\w+/, 'objectref'],
        [/\b(?:\d+(?:\.\d*)?|\.\d+)\b/, 'constant.numeric.moo'],
        [/"/, { token: 'string.quoted.double.moo', next: '@string' }],
        [/\w+/, 'variable']
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'constant.character.escape.moo'],
        [/"/, { token: 'string.quoted.double.moo', next: '@pop' }]
      ]
    }
  })

  // Set up MOOcode theme
  monaco.editor.defineTheme('moocode', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'constant.error', foreground: 'EF5547' },
      { token: 'number', foreground: '81e274' },
      { token: 'property', foreground: '3FCA31' },
      { token: 'verb', foreground: 'ee9966' },
      { token: 'delimiter', foreground: 'EA3FF7' },
      { token: 'object', foreground: '31CAA3' },
      { token: 'objectref', foreground: '9BD3C0', fontStyle: 'italic' },
      { token: 'markup.heading', foreground: 'f9f93d' },
      { token: 'comment', fontStyle: 'italic' },
      { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },
      { token: 'keyword.control.end', foreground: 'A776C5', fontStyle: 'bold' },
      { token: 'keyword.params', foreground: '8686C0', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: '8686C0' },
      { token: 'operators', foreground: 'BADA55' },
      { token: 'operators.semicolon', foreground: 'BADA55', fontStyle: 'bold' },
      { token: 'variable', foreground: '3185CA' },
      { token: 'string', foreground: 'AB9471' }
    ],
    colors: {
      'editor.foreground': '#ABB2BF'
    }
  })

  // Create Monaco editor
  editor = monaco.editor.create(editorContainerRef.value, {
    value: '',
    language: currentLanguage.value,
    theme: 'moocode',
    automaticLayout: true,
    inlayHints: {
      enabled: true
    }
  })

  if (currentLanguage.value === 'moocode') {
    setupMoocodeLineNumbers()
  }
}

function setupMoocodeLineNumbers() {
  if (!editor) return
  
  editor.updateOptions({
    lineNumbers: (lineNumber) => {
      const model = editor?.getModel()
      if (!model) return lineNumber.toString()
      
      const lineContent = model.getLineContent(lineNumber)
      if (lineContent.startsWith('@@') || lineContent === '.') {
        return ''
      }
      
      if (lineContent.startsWith('@program')) {
        atLineCount = lineNumber
        return ''
      } else {
        let adjustedLineNumber = lineNumber - (atLineCount || 0)
        if (adjustedLineNumber < 1) {
          adjustedLineNumber = 1
          atLineCount = 0
        }
        return adjustedLineNumber.toString()
      }
    }
  })
}

function setupStandardLineNumbers() {
  if (!editor) return
  editor.updateOptions({
    lineNumbers: 'on'
  })
}

function switchLanguage(language: string) {
  currentLanguage.value = language
  window.store.set('editorLanguage', language)
  
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel()!, language)
    
    if (language === 'moocode') {
      setupMoocodeLineNumbers()
    } else {
      setupStandardLineNumbers()
    }
  }
}

function setupEventListeners() {
  // Language selector is handled by v-model
  // Buttons are handled by @click in template
}

function setupResizeHandle() {
  if (!resizeHandleRef.value || !headerInfoRef.value || !editorContainerRef.value) return

  let isResizing = false
  let startY = 0
  let startHeaderHeight = 0

  resizeHandleRef.value.addEventListener('mousedown', (e) => {
    isResizing = true
    startY = e.clientY
    startHeaderHeight = headerInfoRef.value!.offsetHeight
    document.body.style.cursor = 'ns-resize'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return
    const dy = e.clientY - startY
    const newHeight = Math.max(60, Math.min(240, startHeaderHeight + dy))
    if (headerInfoRef.value) {
      headerInfoRef.value.style.height = newHeight + 'px'
    }
    if (editorContainerRef.value) {
      // With the new layout, Monaco is flex-driven; keep an explicit min-height only.
      editorContainerRef.value.style.minHeight = '120px'
    }
    if (editor) {
      editor.layout()
    }
  })

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false
      document.body.style.cursor = ''
      if (editor) {
        editor.layout()
      }
    }
  })
}

function handleOpenCodeEditor(payload: CodeEditPayload) {
  codeEditSession = {
    active: false,
    saveCommand: payload.saveCommand,
    headerData: payload.headerData,
    codeLines: payload.codeLines,
    endMarker: payload.endMarker
  }

  // Update header info
  if (headerInfoRef.value) {
    headerInfoRef.value.innerHTML = ''
    payload.headerData.forEach((line) => {
      const div = document.createElement('div')
      div.textContent = line
      headerInfoRef.value!.appendChild(div)
    })
  }

  // Set progstart input
  if (progstartInputRef.value) {
    progstartInputRef.value.value = payload.saveCommand || ''
  }

  // Set code in editor
  if (editor && Array.isArray(payload.codeLines)) {
    editor.setValue(payload.codeLines.join('\n'))
  }
}

async function loadFromFile() {
  if (!editor) return
  const text = await window.api.OpenFile()
  if (text) {
    editor.setValue(text)
  }
}

async function saveToFile() {
  if (!editor) return
  await window.api.saveFile(editor.getValue())
}

function submitToServer() {
  if (!editor) return

  if (codeEditSession && codeEditSession.endMarker) {
    const code = editor.getValue()
    const codeLines = code.split(/\r?\n/)
    const saveCommand = progstartInputRef.value?.value || codeEditSession.saveCommand || ''
    
    const message = [saveCommand, ...codeLines, codeEditSession.endMarker].join('\n')
    window.api.send('submit', message)
  } else {
    window.api.send('submit', editor.getValue())
  }
}

function submitSelectedToServer() {
  if (!editor) return
  const selection = editor.getSelection()
  if (selection && !selection.isEmpty()) {
    const selectedText = editor.getModel()?.getValueInRange(selection)
    if (selectedText) {
      window.api.send('submit', selectedText)
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  // Control-Shift-S
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault()
    submitSelectedToServer()
  }
  // Control-S
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    submitToServer()
  }
}
</script>

<style scoped lang="less">
.mujs-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-ground, #1e1e1e);
}

.mujs-toolbar {
  flex: 0 0 auto;
}

.mujs-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mujs-toolbar-title {
  font-weight: 600;
  color: var(--p-text-color, #fff);
}

.mujs-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mujs-language-select {
  min-width: 180px;
}

.mujs-header-card {
  margin: 6px 8px 0 8px;
}

.mujs-header-card :deep(.p-card-body) {
  padding: 0.75rem;
}

.mujs-header-card :deep(.p-card-content) {
  padding: 0;
}

.mujs-header-info {
  height: 84px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  white-space: pre-wrap;
}

.mujs-progstart-row {
  margin-top: 8px;
}

.mujs-progstart {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.mujs-resize-handle {
  height: 6px;
  cursor: ns-resize;
  background: var(--p-surface-200, #444);
  margin: 6px 8px 0 8px;
  border-radius: 6px;
}

.mujs-monaco {
  flex: 1 1 auto;
  margin: 6px 8px 8px 8px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--p-surface-300, #333);
}
</style>
<style lang="less" scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}
</style>
