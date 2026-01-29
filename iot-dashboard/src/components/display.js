function updateDisplay(number) {
    const displayElement = document.getElementById('number-display');
    if (displayElement) {
        displayElement.textContent = number;
    }
}

export default updateDisplay;