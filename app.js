const API_KEY = "YOUR_API_KEY";

const city = "Gosen";

const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},JP&appid=${API_KEY}&units=metric&lang=ja`;

fetch(url)
    .then(response => response.json())
    .then(data => {
        const pressure = data.main.pressure;

        console.log(pressure);

        document.getElementById("pressure").textContent = pressure + " hPa";
    });