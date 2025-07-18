# MUjs

## Features

- Full HTML5 support
- **Unicode Support** - Full Unicode text display and input support for international characters, symbols, and emojis
- Separate code editor window
  - **Multi-Language Support** - Switch between MOOcode and C# syntax highlighting
  - Smart syntax highlighting tailored for MOO
  - Captures code listings using a new protocol:
    - `ProgStart > <save command>`: Marks the start of a code block and provides the command to send back when saving.
    - `ProgData > <header info>`: Displays up to 8 lines of informational header data above the code editor (read-only, scrollable).
    - `ProgEdit > <code line>`: Each line of code to be edited in the code editor.
    - `ProgEnd > <end marker>`: Marks the end of the code block and is sent back to the server when saving.
  - The code editor popup now displays header info above the code editor, separate from the editable code area.
  - When saving, only the save command, code lines, and end marker are sent back to the server (header info is not sent).
  - Numbers lines from line 1 for each verb in the editor
  - Control-S submits the code back to the server
  - Control-Shift-S submits only the highlighted code to the server
  - Supports loading and saving files to disk

- Accepts and dynamically updates stylesheets from the game server
- Customizable local stylesheet to adjust the appearance and layout of the client
- Protects against script execution by unapproved scripts, only allowing server-provided scripts to run



## Installing 

To build npm (nodeJS) is required

```
npm install
npm run start
```

## Details

A few unique features to the client:

The server can send the following commands

```
!@style:url:http://localhost/stylesheet.less
```
The client will fetch the URL and apply it as a stylesheet

```
!@Window:<title>:<command>:<string>
```
The client will spawn a new window with the string as content
The options are append, prepend, replace, clear and style.
Style takes a URL and will apply a LESS formatted stylesheet
The others require HTML tags to display on the window.

The client will attempt to notify the server of it's sessionkey on connect by issuing the ```@clientkey <token>``` command.
If the server wishes to send custom <script> tags it must include the token as the key attribute.
```
eg.
<script key="token">...</script>
```
