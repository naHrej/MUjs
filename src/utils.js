// utils.js
module.exports.calculateCharCount = function calculateCharCount() {
    // Get the console element
    let consoleElement = document.querySelector('.console');

    // Create a temporary element
    let tempElement = document.createElement('span');

    // Set the text of the temporary element to a single character
    tempElement.textContent = 'a'; // assuming 'a' is representative of an average character width

    // Append the temporary element to the document
    document.body.appendChild(tempElement);

    // Get the width of the temporary element
    let charWidth = tempElement.getBoundingClientRect().width;

    // Remove the temporary element from the document
    document.body.removeChild(tempElement);

    // Get the width of the console element
    let consoleWidth = consoleElement.getBoundingClientRect().width;

    // Calculate the number of characters that will fit horizontally across the console
    let numChars = Math.floor(consoleWidth / charWidth);

    return numChars; // This will return the number of characters that can fit horizontally across the console
};