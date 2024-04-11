// mainRenderer.js


document.addEventListener('DOMContentLoaded', (event) => {
    // We want to create a TcpClient to connect to a server
    const host = "code.deanpool.net";
    const port = 1701;
    let inputHistory = [];
    let currentInputIndex = -1;

    // When we load we apply any user stored settings.
    ApplySettings();


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
                inputField.value = inputHistory[inputHistory.length - 1 - currentInputIndex];
                // Prevent the default action
                event.preventDefault();
            }
        } else if (event.key === 'ArrowDown') {
            // Check if there is a next input
            if (currentInputIndex > 0) {
                // Decrement the current input index
                currentInputIndex--;
                // Set the value of the input field to the next input
                inputField.value = inputHistory[inputHistory.length - 1 - currentInputIndex];
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

    window.api.on('settings-updated', (event) => {
        console.log('Applying settings');
        // Apply the settings
        ApplySettings();
    });

    // Add an event listener for window-resize event
    window.addEventListener('resize', () => {
        // Calculate how many characters can fit on a line
        let columns = window.api.calculateCharCount() - 2;
        let byte1 = Math.floor(columns / 256);
        let byte2 = columns % 256;
        // Send the window size to the server

        window.api.send_naws(byte1, byte2);

        // set scrollbar to bottom
        let consoleElement = document.querySelector('.console');
        consoleElement.scrollTop = consoleElement.scrollHeight;


    });



    // Add an event listener for the 'received-data' event
    document.addEventListener('received-data', (event) => {

        // if the incoming string starts with canvas: we grab everything after that and pass it to the canvas function
        if (event.detail.startsWith("canvas:")) {
            let canvasData = event.detail.substring(7);
            console.log("Canvas data: " + typeof canvasData);
            initCanvas(canvasData);
            let consoleElement = document.querySelector('.console');
            consoleElement.scrollTop = consoleElement.scrollHeight;
            return;
        }
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

        // // Create a new br element
        // let brElement = document.createElement('br');

        // // Append the br element to the console element
        // consoleElement.appendChild(brElement);

        // Use requestAnimationFrame to ensure that scrollTop is set after the DOM has finished updating
        consoleElement.scrollTop = consoleElement.scrollHeight;

    });

    window.api.on('close', () => {
        console.log('Connection closed');
    });

    window.addEventListener('beforeunload', (event) => {
        window.api.end();
    });

});



async function ApplySettings() {
    let consoleElements = document.querySelectorAll('.console');
    consoleElements.forEach(async element => {
        let font = await window.store.get('settings.fontFamily');
        let size = await window.store.get('settings.fontSize');

        element.style.setProperty('font-family', font, 'important');
        element.style.setProperty('font-size', size + 'px', 'important');
    });
}


async function initCanvas(canvasData) {
    // Parse the JSON data
    let heightmap = JSON.parse(canvasData);


    // Create a new canvas and get its context
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // Define the scale factor for the heightmap values
    let scaleFactor = 2;

    canvas.width = heightmap[0].length * scaleFactor;  // Set canvas width
canvas.height = heightmap.length * scaleFactor;  

    // Define the color ranges
    let colorRanges = [
        { min: -10, max: -8, color: '#11074d' }, // Deepest water
        { min: -8, max: -6, color: '#180782' }, // Deep water
        { min: -6, max: -4, color: '#220da3' }, // Medium water
        { min: -4, max: -2, color: '#3219cf' }, // Shallow water
        { min: -2, max: 0, color: '#8c8058' }, // Beach
        { min: 0, max: 2, color: '#1e4a1d' }, // Low land
        { min: 2, max: 4, color: '#257023' }, // Medium land
        { min: 4, max: 6, color: '#4c5443' }, // High land
        { min: 6, max: 8, color: '#664e34' }, // Low mountain
        { min: 8, max: 10, color: '#65607a' }, // High mountain
        { min: 10, max: 12, color: '#6a6a6a'}
    ];
    // Iterate over the rows of the heightmap
    for (let i = 0; i < heightmap.length; i++) {
        // Iterate over the columns of the heightmap
        for (let j = 0; j < heightmap[i].length; j++) {
            // Get the heightmap value at the current position
            let height = heightmap[i][j];

        // Determine the color based on the height
        let rangeIndex = colorRanges.findIndex(range => height >= range.min && height < range.max);
        let color1 = rangeIndex !== -1 ? colorRanges[rangeIndex].color : '#ada9a0';

        // If there is a next range, interpolate between the current color and the next color
        let color2 = color1;
        if (rangeIndex !== -1 && rangeIndex < colorRanges.length - 1) {
            let nextHeight = colorRanges[rangeIndex + 1].min;
            let t = (height - colorRanges[rangeIndex].min) / (nextHeight - colorRanges[rangeIndex].min);      
            color2 = colorRanges[rangeIndex + 1].color;
            color1 = cssColorToRgb(color1);
            color2 = cssColorToRgb(color2);
            color1 = interpolateColor(color1, color2, t);
        }

        // Draw a rectangle on the canvas with the interpolated color
        ctx.fillStyle = color1;
        ctx.fillRect(j * scaleFactor, i * scaleFactor, scaleFactor, scaleFactor);
        }
    }

    // Get the console element
    let consoleElement = document.querySelector('.console');

    // Append the canvas to the console element
    consoleElement.appendChild(canvas);
}

function interpolateColor(color1, color2, factor) {
    if (arguments.length < 3) { 
        factor = 0.5; 
    }
    var result = color1.slice();
    for (var i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
    }
    return 'rgb(' + result.join(',') + ')';
}

function cssColorToRgb(color) {
    // Remove the '#' from the start of the string
    if (color.startsWith('#')) {
        color = color.slice(1);
    }

    // Convert the color string to an array of numbers
    var rgb = [];
    for (var i = 0; i < 3; i++) {
        rgb[i] = parseInt(color.slice(i * 2, i * 2 + 2), 16);
    }

    return rgb;
}