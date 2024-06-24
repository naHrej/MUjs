
require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function () {

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
            // green for verbs
            { token: 'verb', foreground: 'a6e22e' },
            // yellow for perenthesis
            { token: 'delimiter', foreground: 'f8f8f2' },
            // light purple for object_ref
            { token: 'object_ref', foreground: 'bd93f9' },

        ],
    })



        const editor = monaco.editor.create(document.getElementById('container'), {
            value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
            language: 'javascript'
        });
    });
