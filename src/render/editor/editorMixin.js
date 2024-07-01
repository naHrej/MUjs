import * as monaco from "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm";

export const editorMixin = {
  data() {
    return {
      editor: null,
      inputHistory: [],
      currentInputIndex: -1,
      grammar: null,
      registry: null,
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

    monaco.languages.registerInlayHintsProvider("moocode", {
      provideInlayHints: function (model, range, token) {
        const hints = [];
        for (
          let lineNumber = range.startLineNumber;
          lineNumber <= range.endLineNumber;
          lineNumber++
        ) {
          const lineContent = model.getLineContent(lineNumber);
          // Example: Add an inlay hint for lines starting with a specific keyword
          if (lineContent.startsWith("@program")) {
            hints.push({
              text: "Hint text",
              position: {
                lineNumber: lineNumber,
                column: lineContent.length + 1,
              }, // Position at end of line
              kind: monaco.languages.InlayHintKind.Type,
            });
          }
        }
        return { hints: hints };
      },
    });

    this.initEditor();
    window.api.on("update-editor", (event, data) => {
      editor.setValue(editor.getValue() + data);
    });
    // add a DOM READY event listener

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

      window.addEventListener("beforeunload", function () {
        const editorContent = editor.getValue();
        sessionStorage.setItem("editorContent", editorContent);
        
      });

      editor.onDidScrollChange((e) => {
        const position = editor.getPosition();
        const model = editor.getModel();
        let programLineContent = "No @program line found";
        for (
          let lineNumber = position.lineNumber;
          lineNumber > 0;
          lineNumber--
        ) {
          const lineContent = model.getLineContent(lineNumber);
          if (lineContent.includes("@program")) {
            programLineContent = lineContent;
            break; // Stop searching once the nearest @program line is found
          }
        }
        // set the title to the content of the nearest @program line
        document.title = programLineContent + " - Moocode Editor";
      });

      const savedContent = sessionStorage.getItem("editorContent");
      if (savedContent !== null) {
        editor.setValue(savedContent);
        // Restore any other state you've saved as needed
      }
    },
    SubmitToServer() {
      // Send the contents of the editor to the server
      window.api.send("submit", editor.getValue());
    },
    async SaveToFile() {
      await window.api.saveFile(editor.getValue());
    },
    async OpenFile() {
      let text = await window.api.OpenFile();
      editor.setValue(text);
    },

    initEditor() {
      let atLineCount = 0;
      // Initialize your Monaco editor instance
      // For example:
      editor = monaco.editor.create(
        document.getElementById("monaco-editor-moocode"),
        {
          value: "",
          language: "moocode", // Use 'plaintext' initially or the language id if known
          theme: "moocode",
          automaticLayout: true,
          inlayHints: {
            enabled: true,
          },
          lineNumbers: function (lineNumber) {
            const model = editor.getModel();
            if (model) {
              const lineContent = model.getLineContent(lineNumber);
              // if the line starts with @@ stop the line number incrementing and display blank
              if (lineContent.startsWith("@@")) {
                atLineCount++;
                return "";
              }

              if (lineContent.startsWith("@program")) {
                // Reset the line number for the next line
                atLineCount = lineNumber;
                // Return no line number for lines starting with @program
                return "";
              } else {
                // Adjust line number based on the last @program line
                let adjustedLineNumber = lineNumber - atLineCount;
                if (adjustedLineNumber < 1) {
                  adjustedLineNumber = 1;
                  atLineCount = 0;
                }
                return adjustedLineNumber.toString();
              }
            }
            return lineNumber.toString(); // Default line number if model is not accessible
          },
        }
      );

      // Add shortcuts for submitting code ControlOrCommand + S
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
        this.SubmitToServer();
      });
    },
  },
};
