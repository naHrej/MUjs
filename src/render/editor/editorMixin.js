import * as monaco from "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm";

export const editorMixin = {
  data() {
    return {
      editor: null,
      inputHistory: [],
      currentInputIndex: -1,
      grammar: null,
      registry: null,
      currentLanguage: 'moocode', // Track current language
      atLineCount: 0, // Track line count for MOOcode
    };
  },
  async mounted() {
    monaco.languages.register({ id: "moocode" });

    monaco.languages.setMonarchTokensProvider("moocode", {
      tokenizer: {
        root: [
          // comment starts with //
          [/(\/\/|@\@).*$/, "comment"],
          [/^@(program|args|verb)\b/, "markup.heading"],

          // punctuation of various kinds not already involved in other patterns.
          [/[\.,`\'@=><!~?:&|+\-*\/\^%]+/, "operators"],
          [/[;]+/, "operators.semicolon"],
          [/(#\d+)/, "object"],
          [/(\d+)/, "number"],

          [
            /\b(E_NONE|E_TYPE|E_DIV|E_PERM|E_PROPNF|E_VERBNF|E_VARNF|E_INVIND|E_RECMOVE|E_MAXREC|E_RANGE|E_ARGS|E_NACC|E_INVARG|E_QUOTA|E_FLOAT|E_FILE|E_EXEC|E_INTRPT)\b/,
            "constant.error",
          ],

          // Keywords
          [/\b(if|while|for|in|this|try|except)\b/, "keyword.control"],
          [
            /\b(return|endif|endwhile|endfor|else|elseif|finally|endtry)\b/,
            "keyword.control.end",
          ],

          // built-in functions
          [
            /\b(abs|acos|add_property|add_verb|asin|atan|binary_hash|boot_player|buffered_output_length|call_function|caller_perms|callers|ceil|children|chparent|clear_property|connected_players|connected_seconds|connection_name|connection_option|connection_options|cos|cosh|create|crypt|ctime|db_disk_size|decode_binary|delete_property|delete_verb|disassemble|dump_database|encode_binary|equal|eval|exp|floatstr|floor|flush_input|force_input|function_info|idle_seconds|index|is_clear_property|is_member|is_player|kill_task|length|listappend|listdelete|listen|listeners|listinsert|listset|load_server_options|log|log10|log_cache_stats|match|max|max_object|memory_usage|min|move|notify|object_bytes|open_network_connection|output_delimiters|parent|pass|players|properties|property_info|queue_info|queued_tasks|raise|random|read|recycle|renumber|reset_max_object|resume|rindex|rmatch|seconds_left|server_log|server_version|set_connection_option|set_player_flag|set_property_info|set_task_perms|set_verb_args|set_verb_code|set_verb_info|setadd|setremove|shutdown|sin|sinh|sqrt|strcmp|string_hash|strsub|substitute|suspend|tan|tanh|task_id|task_stack|ticks_left|time|tofloat|toint|toliteral|tonum|toobj|tostr|trunc|typeof|unlisten|valid|value_bytes|value_hash|verb_args|verb_cache_stats|verb_code|verb_info|verbs)\b/,
            "keyword.function",
          ],

          //built-in variables
          [
            /\b(verb|args|argspec|obj|objspec|dobj|dobjspec|iobj|iobjspec)\b/,
            "keyword.params",
          ],

          [
            /\b(INT|NUM|FLOAT|LIST|MAP|STR|ANON|OBJ|ERR|ANY)\b/,
            "constant.numeric",
          ],

          //object refs
          [/(\$\w+)([:])(\w+)/, ["objectref", "delimiter", "verb"]],
          [/(\$\w+)([.])(\w+)/, ["objectref", "delimiter", "property"]],
          [
            /(\$\w+)([:])(\()(\w+)(\))/,
            ["objectref", "delimiter", "verb", "variable", "verb"],
          ],
          [
            /(\$\w+)([.])(\()(\w+)(\))/,
            ["objectref", "delimiter", "property", "variable", "property"],
          ],

          [/\$\w+/, "objectref"],

          //objects
          [/(\w+)([:])(\w+)\b/, ["object", "delimiter", "verb"]],
          [/(\w+)([.])(\w+)\b/, ["object", "delimiter", "property"]],
          [
            /(\w+)([:])(\()(\w+)(\))/,
            ["object", "delimiter", "verb", "variable", "verb"],
          ],
          [
            /(\w+)([.])(\()(\w+)(\))/,
            ["object", "delimiter", "property", "variable", "property"],
          ],

          [/\b(?:\d+(?:\.\d*)?|\.\d+)\b/, "constant.numeric.moo"],
          // Strings
          [/"/, { token: "string.quoted.double.moo", next: "@string" }],

          [/(\w+)\b/, { token: "variable" }],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "constant.character.escape.moo"],
          [/"/, { token: "string.quoted.double.moo", next: "@pop" }],
        ],
      },
    });

    monaco.editor.defineTheme("moocode", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "constant.error", foreground: "EF5547" }, // Bright red
        { token: "number", foreground: "81e274" },
        { token: "property", foreground: "3FCA31" }, //2596be
        { token: "verb", foreground: "ee9966" },
        { token: "delimiter", foreground: "EA3FF7" },
        { token: "object", foreground: "31CAA3" },
        { token: "objectref", foreground: "9BD3C0", fontStyle: "italic" },
        { token: "markup.heading", foreground: "f9f93d" },
        { token: "comment", fontStyle: "italic" },
        { token: "keyword.control", foreground: "C586C0", fontStyle: "bold" },
        {
          token: "keyword.control.end",
          foreground: "A776C5",
          fontStyle: "bold",
        },
        { token: "keyword.params", foreground: "8686C0", fontStyle: "bold" },
        { token: "keyword.function", foreground: "8686C0" },
        { token: "operators", foreground: "BADA55" },
        {
          token: "operators.semicolon",
          foreground: "BADA55",
          fontStyle: "bold",
        },
        { token: "variable", foreground: "3185CA" },
        { token: "string", foreground: "AB9471" },
      ],
      colors: {
        "editor.foreground": "#ABB2BF", // Example default foreground color
        yellow: "#FFFF00",
      },
    });

    // Create header info container above the editor
    const editorContainer = document.getElementById('editor');
    let headerInfo = document.getElementById('editor-header-info');
    if (!headerInfo) {
      headerInfo = document.createElement('div');
      headerInfo.id = 'editor-header-info';
      headerInfo.style.maxHeight = '120px'; // 8 lines * 15px
      headerInfo.style.overflowY = 'auto';
      headerInfo.style.background = '#222';
      headerInfo.style.color = '#cbd5d0';
      headerInfo.style.fontFamily = 'monospace';
      headerInfo.style.fontSize = '14px';
      headerInfo.style.padding = '8px';
      headerInfo.style.marginBottom = '8px';
      headerInfo.style.borderRadius = '6px';
      headerInfo.style.border = '1px solid #444';
      headerInfo.style.boxSizing = 'border-box';
      editorContainer.insertBefore(headerInfo, editorContainer.firstChild);
    }

    // Listen for code editor open event to update header info
    window.api.on('open-code-editor', (event, payload) => {
      // payload.headerData is an array of strings
      if (Array.isArray(payload.headerData)) {
        headerInfo.innerHTML = '';
        payload.headerData.forEach(line => {
          const div = document.createElement('div');
          div.textContent = line;
          headerInfo.appendChild(div);
        });
      }
      // Store session info for saving
      this.codeEditSession = {
        saveCommand: payload.saveCommand,
        headerData: payload.headerData,
        codeLines: payload.codeLines,
        endMarker: payload.endMarker
      };
      // Set code in editor
      if (Array.isArray(payload.codeLines)) {
        editor.setValue(payload.codeLines.join('\n'));
      }
    });

    this.initEditor();

    window.api.on("update-editor", (event, data) => {
      editor.setValue(editor.getValue() + data);
    });

    window.addEventListener("DOMContentLoaded", () => {
      window.api.send("editor-ready");
    });

    this.setupEventListeners();
  },
  methods: {
    setupEventListeners() {
      const loadButton = document.getElementById("load");
      const saveButton = document.getElementById("save");
      const submitButton = document.getElementById("submit");
      const languageSelector = document.getElementById("language-selector");

      loadButton.addEventListener("click", () => {
        const text = this.OpenFile();
        editor.setValue(text);
      });

      saveButton.addEventListener("click", () => {
        this.SaveToFile();
      });

      submitButton.addEventListener("click", () => {
        this.SubmitToServer();
      });

      // Language selector event listener
      languageSelector.addEventListener("change", (e) => {
        this.switchLanguage(e.target.value);
      });

      // Set initial language selector value
      languageSelector.value = this.currentLanguage;

      // Load saved language preference
      window.store.get('editorLanguage').then((savedLanguage) => {
        if (savedLanguage && savedLanguage !== this.currentLanguage) {
          this.currentLanguage = savedLanguage;
          languageSelector.value = savedLanguage;
          this.switchLanguage(savedLanguage);
        }
      });

      window.addEventListener("beforeunload", function () {
        const editorContent = editor.getValue();
        sessionStorage.setItem("editorContent", editorContent);
        
      });
      // Add keydown event listener for window
      window.addEventListener("keydown", (e) => {
        // Control-Shift-S
        if (e.ctrlKey && e.shiftKey && e.key === "S") {
          e.preventDefault();
          this.submitSelectedToServer();
        }
        // Control-S
        if (e.ctrlKey && e.key === "s") {
          e.preventDefault();
          this.SubmitToServer();
        }
      });

      editor.onDidScrollChange((e) => {
        this.UpdateTitle();
      });

      const savedContent = sessionStorage.getItem("editorContent");
      if (savedContent !== null) {
        editor.setValue(savedContent);
        // Restore any other state you've saved as needed
      }
    },
    UpdateTitle() {
      const position = editor.getPosition();
      const model = editor.getModel();
      
      if (this.currentLanguage === 'moocode') {
        let programLineContent = "No @program line found";
        for (
          let lineNumber = position.lineNumber;
          lineNumber > 0;
          lineNumber--
        ) {
          const lineContent = model.getLineContent(lineNumber);
          if (lineContent.includes("@program")) {
            programLineContent = lineContent;
            // remove the @program keyword from the title
            programLineContent = programLineContent.replace("@program", "").trim();
            break; // Stop searching once the nearest @program line is found
          }
        }
        // set the title to the content of the nearest @program line
        document.title = programLineContent + " - Moocode Editor";
      } else {
        // For C# and other languages, use a generic title
        const languageName = this.currentLanguage.charAt(0).toUpperCase() + this.currentLanguage.slice(1);
        document.title = `${languageName} Code Editor - MUjs`;
      }
    },
    submitSelectedToServer() {
      const selection = editor.getSelection();
      // Check if the selection is not empty
      if (!selection.isEmpty()) {
        const selectedText = editor.getModel().getValueInRange(editor.getSelection());
        window.api.send("submit", selectedText);
      } else {
        console.log("No text is selected.");
      }
    },
    SubmitToServer() {
      // If code editing session info is available, use it
      if (this.codeEditSession && this.codeEditSession.saveCommand && this.codeEditSession.endMarker) {
        // Get the code from the editor (as array of lines)
        let code = editor.getValue();
        let codeLines = code.split(/\r?\n/);
        // Compose the message to send back to the server as a single string
        let message = [
          this.codeEditSession.saveCommand,
          ...codeLines,
          this.codeEditSession.endMarker
        ].join('\n');
        console.debug('[SubmitToServer] Sending code block to server:', message);
        window.api.send("submit",message)
          .then(() => {
            console.debug('[SubmitToServer] Code block sent successfully.');
          })
          .catch((err) => {
            console.error('[SubmitToServer] Error sending code block:', err);
          });
      } else {
        // Fallback: just send the editor contents
        console.debug('[SubmitToServer] No codeEditSession, sending editor contents.');
        window.api.send("submit", editor.getValue());
      }
    },
    async SaveToFile() {
      await window.api.saveFile(editor.getValue());
    },
    async OpenFile() {
      let text = await window.api.OpenFile();
      editor.setValue(text);
    },

    switchLanguage(language) {
      this.currentLanguage = language;
      
      // Save language preference
      window.store.set('editorLanguage', language);
      
      // Get current editor content and position
      const currentContent = editor.getValue();
      const currentPosition = editor.getPosition();
      
      // Update the language model
      monaco.editor.setModelLanguage(editor.getModel(), language);
      
      // Update line numbers based on language
      if (language === 'moocode') {
        this.setupMoocodeLineNumbers();
      } else {
        this.setupStandardLineNumbers();
      }
      
      // Restore position
      editor.setPosition(currentPosition);
      
      console.log(`Switched to ${language} language`);
    },

    setupMoocodeLineNumbers() {
      // Apply MOOcode-specific line numbering
      editor.updateOptions({
        lineNumbers: (lineNumber) => {
          const model = editor.getModel();
          if (model) {
            const lineContent = model.getLineContent(lineNumber);
            // if the line starts with @@ stop the line number incrementing and display blank
            if (lineContent.startsWith('@@') || lineContent == '.') {
              return '';
            }

            if (lineContent.startsWith("@program")) {
              // Reset the line number for the next line
              this.atLineCount = lineNumber;
              // Return no line number for lines starting with @program
              return "";
            } else {
              // Adjust line number based on the last @program line
              let adjustedLineNumber = lineNumber - (this.atLineCount || 0);
              if (adjustedLineNumber < 1) {
                adjustedLineNumber = 1;
                this.atLineCount = 0;
              }
              return adjustedLineNumber.toString();
            }
          }
          return lineNumber.toString(); // Default line number if model is not accessible
        }
      });
    },

    setupStandardLineNumbers() {
      // Apply standard line numbering for C# and other languages
      editor.updateOptions({
        lineNumbers: 'on'
      });
    },

    initEditor() {
      let atLineCount = 0;
      // Initialize your Monaco editor instance
      // For example:
      editor = monaco.editor.create(document.getElementById('monaco-editor-moocode'), {
        value: '',
        language: this.currentLanguage,
        theme: 'moocode',
        automaticLayout: true,
        inlayHints: {
          enabled: true,
        },
      });

      // Set up initial line numbers based on current language
      if (this.currentLanguage === 'moocode') {
        this.setupMoocodeLineNumbers();
      } else {
        this.setupStandardLineNumbers();
      }

      // Add keydown event listener
      editor.onKeyDown((e) => {
        this.UpdateTitle();
      });
      
      


    },
  },
};
