self.addEventListener("push", event => {

    const data = event.data
        ? event.data.json()
        : {};

    const title = data.title || "🐕 ウクの気圧予報";

    const options = {
        body: data.body || "気圧予報が届きました",
        icon: "/icon.png"
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});