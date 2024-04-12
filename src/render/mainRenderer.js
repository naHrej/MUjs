const app = Vue.createApp({
    el: '#app',
    data() {
        return {
            host: "code.deanpool.net",
            port: 1701,
            inputHistory: [],
            currentInputIndex: -1,
            inputField: '',
            terminal: null,
            showApp: false
        };
    },
    mounted() {
        // get the terminal element
        this.terminal = document.querySelector('.console');
        this.ApplySettings();

        window.api.on('site-selected', (event, host, port) => {
            
            this.host = host;
            this.port = port;
            window.api.connect(this.port, this.host);

        });
           
        window.api.on('connect', () => {
            this.showApp = true;
            console.log('Connected to the server');
            setInterval(() => {
                window.api.write('idle');
            }, 60000);
        });


        window.addEventListener('resize', () => {
            // Calculate how many characters can fit on a line
            let columns = window.api.calculateCharCount() - 2;
            let byte1 = Math.floor(columns / 256);
            let byte2 = columns % 256;
            // Send the window size to the server
            window.api.send_naws(byte1, byte2);
            // set scrollbar to bottom
            this.terminal.scrollTop = this.terminal.scrollHeight;
        });

        window.api.on('reconnect', () => {
            console.log('Reconnecting');
            window.api.connect(this.port, this.host);
        });

        window.api.on('settings-updated', (event) => {
            console.log('Applying settings');
            // Apply the settings
            this.ApplySettings();
        });
        window.api.on('close', () => {
            console.log('Connection closed');
        });


        window.addEventListener('beforeunload', (event) => {
            window.api.end();
        });
        
        window.api.on('received-data', (event, data) => {
            console.log('Received data:', data);
            if (data.startsWith("canvas:")) {
                let canvasData = data.substring(7);
                initCanvas(canvasData);

                this.terminal.scrollTop = this.terminal.scrollHeight;
                return;
            }
            let html = window.api.ansi_to_html(data);
            let newElement = document.createElement('div');
            newElement.innerHTML = html;
            this.terminal.appendChild(newElement);
            this.terminal.scrollTop = this.terminal.scrollHeight;
        });

    },
    methods: {
        handleKeydown(event) {
            console.log("Key pressed: " + event.key);
            if (event.key === 'Enter') {
                event.preventDefault();
                let text = this.inputField;
                this.inputHistory.push(text);
                this.currentInputIndex = -1;
                this.inputField = '';
                console.log("Input text:" + text);
                window.api.write(text);
            } else if (event.key === 'ArrowUp') {
                if (this.currentInputIndex < this.inputHistory.length - 1) {
                    this.currentInputIndex++;
                }
            }
        },
        async ApplySettings() {
                let font = await window.store.get('settings.fontFamily');
                let size = await window.store.get('settings.fontSize');

                this.terminal.style.setProperty('font-family', font, 'important');
                this.terminal.style.setProperty('font-size', size + 'px', 'important');
        }
    }
});

app.mount('#app');



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
        { min: 10, max: 12, color: '#6a6a6a' }
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
            let color3 = color1;
            if (rangeIndex !== -1 && rangeIndex < colorRanges.length - 1) {
                let nextHeight = colorRanges[rangeIndex + 1].min;
                let t = (height - colorRanges[rangeIndex].min) / (nextHeight - colorRanges[rangeIndex].min);
                color2 = colorRanges[rangeIndex + 1].color;
                color3 = color2;
                color1 = cssColorToRgb(color1);
                color2 = cssColorToRgb(color2);
                color1 = interpolateColor(color1, color2, t);
            }

            let gradient = ctx.createLinearGradient(j * scaleFactor, i * scaleFactor, (j + 1) * scaleFactor, (i + 1) * scaleFactor);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(0.5, color3);
            gradient.addColorStop(1, color1);
            ctx.fillStyle = gradient;
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