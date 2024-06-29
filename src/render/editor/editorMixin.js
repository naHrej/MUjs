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
          // Keywords
          // comment starts with //
          [/\/\/.*$/, "comment"],
          [/\b(if|while|for|return|endif|endwhile|endfor|else|elseif|in|this|try|except|finally|endtry)\b/, "keyword.control"],
          [/\b(typeof|toint|tofloat|toobj|tostr|raise)\b/, "keyword.other"],
          [/\b(INT|NUM|FLOAT|LIST|MAP|STR|ANON|OBJ|ERR)\b/, "constant.numeric"],
          [/@(program|args|verb)\b/, "markup.heading"],
          // Special handling for object:verb
          // Capture object and verb separately
          [/(\w+)([:])(\w+)\b/, ["object", "delimiter", "verb"]],
          // Special handling for object.property
          // Capture object and property separately
          [/(\w+)([.]\w+)\b/, ["object", "property"]],
          // special handling for object_ref:verb
          // Capture object_ref and verb separately
          [/$(\w+)([:])(\w+)\b/, ["object_ref", "delimiter", "verb"]],
          // special handling for object_ref.property
          // Capture object_ref and property separately
          [/$(\w+)([.]\w+)\b/, ["object_ref", "property"]],
          // Special handling for object_ref
          [/$(\w+)\b/, "object_ref"],
          // Special handling for object
          [/\b(\w+)\b/, "object"],

          [/\b(?:\d+(?:\.\d*)?|\.\d+)\b/, "constant.numeric.moo"],
          // Strings
          [/"/, { token: "string.quoted.double.moo", next: "@string" }],
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
        { token: 'property', foreground: '2596be' },
        { token: 'object', foreground: '76b5c5' },
        { token: 'verb', foreground: 'a6e22e' },
        { token: 'delimiter', foreground: 'f8f8f2' },
        { token: 'object_ref', foreground: 'bd93f9' },
      ],
      colors: {
        'editor.foreground': '#ABB2BF' // Example default foreground color
      }
    });


    this.initEditor();

    this.setupEventListeners();

  },
  methods: {
    setupEventListeners() {
      const loadButton = document.getElementById('load');
      const saveButton = document.getElementById('save');
      const submitButton = document.getElementById('submit');

      loadButton.addEventListener('click', () => {
        this.OpenFile();
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
       await window.api.SaveFile(editor.getValue());
    },
    async OpenFile() {
      editor.setValue(await window.api.OpenFile());
    },

    initEditor() {
      // Initialize your Monaco editor instance
      // For example:
      editor = monaco.editor.create(document.getElementById('monaco-editor-moocode'), {
        value: '',
        language: 'moocode', // Use 'plaintext' initially or the language id if known
        theme: 'moocode'
      });
    },

  }
}
