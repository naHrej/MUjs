import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm'


export const editorMixin = {
  data() {
    return {
      editor: null,
      inputHistory: [],
      currentInputIndex: -1,
      grammar: null,
      registry: null
    };
  },
  async mounted() {
    monaco.languages.register({ id: 'moocode' });

    monaco.languages.setMonarchTokensProvider('moocode', {
      tokenizer: {
        root: [
          // comment starts with //
          [/(\/\/|@\@).*$/, "comment"],
          [/^@(program|args|verb|@)\b/, "markup.heading"],


          //fucking literal dollar sign goddamnit
          //[/\$/,"dollar"],
          // Special handling for object_ref by itself
          //[/\$\w+/, "object_ref"],


          // punctuation of various kinds not already involved in other patterns.
          [/[\.\`\'@=><!~?:&|+\-*\/\^%]+/, "operators"],
          [/[\[\]]+/, "delimiter.square"],
          [/[\{\}]+/, "delimeter.curly"],
          [/[\(\)]+/, "delimeter.parenthesis"],
          [/[\<\>]+/, "delimeter.angle"],          
          [/;+/, "operators,semicolon"],          

          //These work like I expect them to in that we define the patterns and we define the colors:
          [/(#\d+)/, "object"],
          [/(\d+)/, "number"],
          
          [/\b(E_NONE|E_TYPE|E_DIV|E_PERM|E_PROPNF|E_VERBNF|E_VARNF|E_INVIND|E_RECMOVE|E_MAXREC|E_RANGE|E_ARGS|E_NACC|E_INVARG|E_QUOTA|E_FLOAT|E_FILE|E_EXEC|E_INTRPT)\b/, "constant.error"],         


          //These work, but the colors seem to be inherited from somewhere else


          // Keywords
          [/\b(if|while|for|return|endif|endwhile|endfor|else|elseif|in|this|try|except|finally|endtry)\b/, 
            "keyword.control"],

          [/\b(abs|acos|add_property|add_verb|asin|atan|binary_hash|boot_player|buffered_output_length|call_function|caller_perms|callers|ceil|children|chparent|clear_property|connected_players|connected_seconds|connection_name|connection_option|connection_options|cos|cosh|create|crypt|ctime|db_disk_size|decode_binary|delete_property|delete_verb|disassemble|dump_database|encode_binary|equal|eval|exp|floatstr|floor|flush_input|force_input|function_info|idle_seconds|index|is_clear_property|is_member|is_player|kill_task|length|listappend|listdelete|listen|listeners|listinsert|listset|load_server_options|log|log10|log_cache_stats|match|max|max_object|memory_usage|min|move|notify|object_bytes|open_network_connection|output_delimiters|parent|pass|players|properties|property_info|queue_info|queued_tasks|raise|random|read|recycle|renumber|reset_max_object|resume|rindex|rmatch|seconds_left|server_log|server_version|set_connection_option|set_player_flag|set_property_info|set_task_perms|set_verb_args|set_verb_code|set_verb_info|setadd|setremove|shutdown|sin|sinh|sqrt|strcmp|string_hash|strsub|substitute|suspend|tan|tanh|task_id|task_stack|ticks_left|time|tofloat|toint|toliteral|tonum|toobj|tostr|trunc|typeof|unlisten|valid|value_bytes|value_hash|verb_args|verb_cache_stats|verb_code|verb_info|verbs)\b/, 
            "keyword.function"],

          [/\b(verb|args|argspec|obj|objspec|dobj|dobjspec|iobj|iobjspec)\b/, 
            "keyword.params"],
          
          [/\b(INT|NUM|FLOAT|LIST|MAP|STR|ANON|OBJ|ERR|ANY)\b/, "constant.numeric"],


          [/(\$\w+)([:])(\w+)\b/, ["objectref", "delimiter", "verb"]],       
          [/(\$\w+)([.])(\w+)\b/, ["objectref", "delimiter", "property"]],
          [/(\w+)([:])(\w+)\b/, ["object", "delimiter", "verb"]], 
          [/(\w+)([.])(\w+)\b/, ["object", "delimiter", "property"]],
          
          //[/\b(\w+)\b/, "object"],

          [/\b(?:\d+(?:\.\d*)?|\.\d+)\b/, "constant.numeric.moo"],
          // Strings
          [/"/, { token: "string.quoted.double.moo", next: "@string" }],
          [/(\w+)b/, { token: "variable" }]
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "constant.character.escape.moo"],
          [/"/, { token: "string.quoted.double.moo", next: "@pop" }],
        ]
      }
    });

    monaco.editor.defineTheme("moocode", {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'dollar', foreground: 'ffff00' }, // Bright yellow
        { token: 'constant.error', foreground: 'ff2525' }, // Bright red
        { token: 'number', foreground: '00FF99' },
        { token: 'property', foreground: '2596be' },
        { token: 'verb', foreground: 'ffff00' },
        { token: 'delimiter', foreground: 'EA3FF7' },
        { token: 'object', foreground: '00FFFF' },
        { token: 'objectref', foreground: 'FFFF00' },
        { token: 'markup.heading', foreground: 'f9f93d' },
        { token: 'comment', fontStyle: 'italic'},
        { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold'},
      //  { token: 'keyword.params', fontStyle: 'bold'},  
        { token: 'keyword.function', foreground: '8686C0'},     
        { token: 'operators.semicolon', foreground: '00FF00', fontStyle: 'bold'},
        { token: 'variable', foreground: '2596be' },


        
      ],
      colors: {
        'editor.foreground': '#ABB2BF', // Example default foreground color
        'yellow': "#FFFF00"
      }
    });


    this.initEditor();
    window.api.on('update-editor', (event, data) => {
      editor.setValue(editor.getValue() + data);
    });
    // add a DOM READY event listener

    window.addEventListener('DOMContentLoaded', () => {
      window.api.send('editor-ready');
    });
    


    this.setupEventListeners();

  },
  methods: {
    setupEventListeners() {
      const loadButton = document.getElementById('load');
      const saveButton = document.getElementById('save');
      const submitButton = document.getElementById('submit');

      loadButton.addEventListener('click', () => {
        const text = this.OpenFile();
        editor.setValue(text);
      });

      saveButton.addEventListener('click', () => {
        this.SaveToFile();
      });

      submitButton.addEventListener('click', () => {
        this.SubmitToServer();
      });
    },
    SubmitToServer() {
      // Send the contents of the editor to the server
      window.api.send('submit', editor.getValue());
    },
    async SaveToFile() {
       await window.api.saveFile(editor.getValue());
    },
    async OpenFile() {
      let text = await window.api.OpenFile();
      editor.setValue(text);
    },

    initEditor() {
      // Initialize your Monaco editor instance
      // For example:
      editor = monaco.editor.create(document.getElementById('monaco-editor-moocode'), {
        value: '',
        language: 'moocode', // Use 'plaintext' initially or the language id if known
        theme: 'moocode'
      });

      // Add shortcuts for submitting code ControlOrCommand + S
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
        this.SubmitToServer();
      });

    },

  }
}
