self.addEventListener("push", event => {

    const data = event.data
        ? event.data.json()
        : {};

    const title = data.title || "🐕 わんこの気圧予報";

    const options = {
        body: data.body || "気圧予報が届きました",
        icon: "images/icon.png"
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});