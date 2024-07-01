# MUjs

**Features**

- Full HTML5 support
- Separate code editor window
  - Smart syntax hilighting tailored for MOO
  - Captures code listings when lines begin with the "FugueEdit > " prefix
  - Numbers lines from line 1 for each verb in the editor
  - Control-S submits the code back to the server
  - Control-Shift-S submits only the hilighted code to the server
  - Supports loading and saving files to disk

- Accepts and dynamically updates stylesheets from the game server
- Customizable local stylesheet to adjust the appearance and layout of the client
- Protects against script execution by unapproved scripts, only allowing server-provided scripts to run





**Building from source**

To build npm (nodeJS) is required

```
npm install
npm run start
```

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
