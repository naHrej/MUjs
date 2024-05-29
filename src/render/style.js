function loadStyleFromURL(url) {

    url = url.split('.less')[0];

    // Append a unique query string to the URL
    url += '.less?' + new Date().getTime();

    // Load and compile the LESS file
    less.render('@import "' + url + '";', function (error, output) {
        if (error) {
            console.error(error);
        } else {
            // Create a new style tag
            let style = document.createElement('style');

            // Set the id of the style tag
            style.id = 'dynamic-style';

            // Set the content of the style tag to the compiled CSS
            style.textContent = output.css;

            // Remove the old style tag if it exists
            let oldStyle = document.getElementById('dynamic-style');
            if (oldStyle) {
                oldStyle.remove();
            }

            // Append the style tag to the head of the document
            document.body.appendChild(style);
        }
    }, { async: true });
}