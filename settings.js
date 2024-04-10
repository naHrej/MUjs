window.onload = async function() {
    const fonts = await window.api.settings.getFonts();
    console.log(fonts); // Log the fonts

    const settings = window.api.settings.load();

    const select = document.getElementById('FontFamily');
    console.log(select); // Log the select element

    fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.text = font;
        select.appendChild(option);
    });

    select.value = settings.fontFamily;
    document.getElementById('FontSize').value = settings.fontSize;


    document.getElementById('saveButton').addEventListener('click', function() {
        settings.fontFamily = select.value;
        settings.fontSize = document.getElementById('FontSize').value;
        window.api.settings.save(settings);
        window.api.send('settings-updated', settings);
    });

}