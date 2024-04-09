// mainRenderer.js


document.addEventListener('DOMContentLoaded', (event) => {
    // We want to create a TcpClient to connect to a server
    const host = "code.deanpool.net";
    const port = 1701;
    let inputHistory = [];
let currentInputIndex = -1;

    
    // Get the input field
    let inputField = document.querySelector('.textbox'); // Changed '.input' to '.textbox'
    inputField.addEventListener('keydown', (event) => {
        // Check if the Enter key was pressed
        if (event.key === 'Enter') {
            // Prevent the default action to stop the form from being submitted
            event.preventDefault();
    
            // Get the text from the input field
            let text = inputField.value;
    
            // Add the text to the input history and reset the current input index
            inputHistory.push(text);
            currentInputIndex = -1;
    
            // Clear the input field
            inputField.value = '';
    
            console.log("Input text:" + text);
            // Send the text to the server
            window.api.write(text);
        } else if (event.key === 'ArrowUp') {
            // Check if there is a previous input
            if (currentInputIndex < inputHistory.length - 1) {
                // Increment the current input index
                currentInputIndex++;
                // Set the value of the input field to the previous input
                inputField.value  = inputHistory[inputHistory.length - 1 - currentInputIndex];
                // Prevent the default action
                event.preventDefault();
            }
        } else if (event.key === 'ArrowDown') {
            // Check if there is a next input
            if (currentInputIndex > 0) {
                // Decrement the current input index
                currentInputIndex--;
                // Set the value of the input field to the next input
                inputField.value  = inputHistory[inputHistory.length - 1 - currentInputIndex];
                // Prevent the default action
                event.preventDefault();
            } else if (currentInputIndex === 0) {
                // Clear the input field
                inputField.value = '';
                // Reset the current input index
                currentInputIndex = -1;
                // Prevent the default action
                event.preventDefault();
            }
        }
    });

    window.api.connect(port, host);
    console.log('Connected');

    // Send some data to the server after the connection is established
    window.api.on('connect', () => {
        console.log('Connected to the server');
    });
    
    // Set up the event listener for the 'received-data' event
    window.api.receive('received-data', (buffer) => {
        // Convert the Buffer to a string
        let dataString = buffer;


        // Emit the 'received-data' event with the received data
        let event = new CustomEvent('received-data', { detail: unicodeString });
        document.dispatchEvent(event);
    });

    // Add an event listener for window-resize event
    window.addEventListener('resize', () => {
        // Calculate how many characters can fit on a line
        let columns = window.api.calculateCharCount()-2;
        let byte1 = Math.floor(columns / 256);
        let byte2 = columns % 256;
        // Send the window size to the server

        window.api.send_naws(byte1, byte2); 

        // set scrollbar to bottom
        let consoleElement = document.querySelector('.console');
        consoleElement.scrollTop = consoleElement.scrollHeight;

        
    });

    // Add an event listener for the 'received-data' event
    document.addEventListener('received-data',  (event) => {
        // Get the console element
        let consoleElement = document.querySelector('.console');

        // Convert the ANSI escape codes to HTML tags
        let html = window.api.ansi_to_html(event.detail);

        // Create a new div element
        let newElement = document.createElement('div');

        // Set the innerHTML of the new element
        newElement.innerHTML = html;

        // Append the new element to the console element
        consoleElement.appendChild(newElement);

        // Create a new br element
        let brElement = document.createElement('br');

        // Append the br element to the console element
        consoleElement.appendChild(brElement);
        consoleElement.scrollTop = consoleElement.scrollHeight;
        
    });

    window.api.on('close', () => {
        console.log('Connection closed');
    });

    window.addEventListener('beforeunload', (event) => {
        window.api.end();
    });
});