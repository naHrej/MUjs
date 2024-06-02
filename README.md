# MUjs

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
