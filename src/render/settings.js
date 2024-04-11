window.onload = async function() {
    const fonts = await window.api.getFonts();
    const select = document.getElementById('FontFamily');

    fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.text = font;
        select.appendChild(option);
    });

    let fontFamily = await window.store.get('settings.fontFamily');
    let fontSize = await window.store.get('settings.fontSize');
    select.value = fontFamily;
    document.getElementById('FontSize').value = fontSize;

    document.getElementById('saveButton').addEventListener('click', function() {
        window.store.set("settings.fontFamily",select.value);
        window.store.set("settings.fontSize",document.getElementById('FontSize').value);
        window.api.send('settings-updated');
    });
}