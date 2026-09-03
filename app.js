const VAPID_PUBLIC_KEY =
    "BB9oI0A5rn7GCwcqOlPW1yijUWUPAyYueDsUP0ClnyxQ1xgm7m3BQts_nNKYr-Y6KpSLW1WU259xajWrwpg60JE";


// ========================================
// 気圧変化の判定
// ========================================

function judgePressureChange(change) {
    const decrease = Math.max(0, -change);

    if (decrease <= 2) {
        return "🌤️ 影響は少なめ";
    }

    if (decrease <= 4) {
        return "🌥️ 影響する可能性あり";
    }

    if (decrease <= 9) {
        return "⚠️ 影響する可能性が高め";
    }

    return "🚨 影響する可能性がかなり高い";
}

function getWalkFace(change) {
    const decrease = Math.max(0, -change);

    if (decrease <= 2) {
        return "images/shiba1.png";
    }

    if (decrease <= 4) {
        return "images/shiba2.png";
    }

    if (decrease <= 9) {
        return "images/shiba3.png";
    }

    return "images/shiba4.png";
}

// ========================================
// 危険度バー
// ========================================

function setPressureBar(elementId, change) {
    const decrease = Math.max(0, -change);

    let width;

    if (decrease <= 2) {
        width = "12.5%";
    } else if (decrease <= 4) {
        width = "37.5%";
    } else if (decrease <= 9) {
        width = "68.75%";
    } else {
        width = "100%";
    }

    const bar =
        document.getElementById(elementId);

    if (bar) {
        bar.style.width = width;
    }
}


// ========================================
// お散歩メッセージ
// ========================================

function getWalkMessage(change) {
    const decrease = Math.max(0, -change);

    if (decrease <= 2) {
        return "いつも通りのお散歩で大丈夫そう";
    }

    if (decrease <= 4) {
        return "お散歩は様子を見ながら";
    }

    if (decrease <= 9) {
        return "無理せず様子を見て";
    }

    return "無理せず、体調に注意";
}


// ========================================
// 気圧変化・天気データ取得
// ========================================

async function loadPressureChange() {
    const latitude =
        localStorage.getItem("latitude");

    const longitude =
        localStorage.getItem("longitude");

    if (!latitude || !longitude) {
        console.error("緯度・経度がありません");
        return;
    }

    // --------------------------------
    // 現在時刻を正時にする
    // --------------------------------

    const now = new Date();

    now.setMinutes(0, 0, 0);

    // --------------------------------
    // 6時間前から取得
    // --------------------------------

    const start = new Date(now);

    start.setHours(
        start.getHours() - 6,
    );

    const startUnix =
        Math.floor(
            start.getTime() / 1000,
        );

    console.log("現在:", now);
    console.log("取得開始:", start);

    // --------------------------------
    // Cloud Functions経由で天気データ取得
    // --------------------------------

    try {
        const result =
            await window.getWeatherData({
                latitude: Number(latitude),
                longitude: Number(longitude),
            });

        const hourly =
            result.data.data;

        console.log(
            "Cloud Functions経由で天気データ取得成功！",
        );

        console.log(
            "データ件数:",
            hourly.length,
        );


        // ========================================
        // 現在のお散歩
        // 6時間前 → 現在
        // ========================================

        const current =
            new Date(now);

        const minus6 =
            new Date(current);

        minus6.setHours(
            minus6.getHours() - 6,
        );

        const currentData =
            hourly.find((item) =>
                item.dt ===
                Math.floor(
                    current.getTime() / 1000,
                ),
            );

        const minus6Data =
            hourly.find((item) =>
                item.dt ===
                Math.floor(
                    minus6.getTime() / 1000,
                ),
            );

        let currentWalkChange = null;

        if (
            currentData &&
            minus6Data
        ) {
            currentWalkChange =
                currentData.pressure -
                minus6Data.pressure;
        }


        // ========================================
        // 現在のお散歩を画面表示
        // ========================================

        if (currentWalkChange !== null) {
            const judgment =
                judgePressureChange(
                    currentWalkChange,
                );

            const message =
                getWalkMessage(
                    currentWalkChange,
                );


            document.getElementById(
                "currentWalkFace",
            ).src = getWalkFace(currentWalkChange);

            document.getElementById(
                "currentWalkMessage",
            ).textContent = message;

            document.getElementById(
                "currentWalkChange",
            ).textContent =
                (currentWalkChange > 0 ?
                    "+" : "") +
                currentWalkChange +
                " hPa";

                setPressureBar(
                    "currentPressureBar",
                    currentWalkChange,
                );

        }


        // ========================================
        // 現在の天気
        // ========================================

        if (currentData) {
            document.getElementById(
                "currentPressure",
            ).textContent =
                Math.round(
                    currentData.pressure,
                );

            document.getElementById(
                "currentTemperature",
            ).textContent =
                Math.round(
                    currentData.temp * 10,
                ) / 10;

            document.getElementById(
                "currentHumidity",
            ).textContent =
                currentData.humidity;
        }


        // ========================================
        // これから3時間の降水確率
        // ========================================

        const rainProbabilities = [];

        for (let i = 1; i <= 3; i++) {
            const target =
                new Date(current);

            target.setHours(
                target.getHours() + i,
            );

            const targetUnix =
                Math.floor(
                    target.getTime() / 1000,
                );

            const item =
                hourly.find((weather) =>
                    weather.dt === targetUnix,
                );

            let probability = null;

            if (
                item &&
                item.pop !== undefined
            ) {
                probability =
                    Math.round(
                        item.pop * 100,
                    );
            }

            rainProbabilities.push(
                probability,
            );

            const timeElement =
                document.getElementById(
                    `rain${i}hTime`,
                );

            const rainElement =
                document.getElementById(
                    `rain${i}h`,
                );

            if (timeElement) {
                timeElement.textContent =
                    `${target.getHours()}:00`;
            }

            if (rainElement) {
                rainElement.textContent =
                    probability !== null ?
                        probability + "%" :
                        "---";
            }
        }

        console.log(
            "1〜3時間後の降水確率:",
            rainProbabilities,
        );


        // ========================================
        // 現在のお散歩の降水確率
        // 1時間後
        // ========================================

        const currentRain =
            rainProbabilities[0];

        document.getElementById(
            "currentRainProbability",
        ).textContent =
            currentRain !== null ?
                currentRain :
                "---";


        // ========================================
        // 次のお散歩
        // ========================================

        const nextWalkPressure =
            window.nextWalkPressure;

        let nextWalkChange = null;
        let nextWalkLabel = null;

        if (nextWalkPressure) {
            nextWalkChange =
                nextWalkPressure.change;

            nextWalkLabel =
                nextWalkPressure.label;

            console.log(
                "Firestoreの次のお散歩:",
                nextWalkPressure,
            );
        } else {
            console.log(
                "Firestoreに次のお散歩データがありません",
            );
        }


        // ========================================
        // 次のお散歩の表示
        // ========================================

        if (
            nextWalkChange !== null &&
            nextWalkLabel
        ) {
            const message =
                getWalkMessage(
                    nextWalkChange,
                );

            document.getElementById(
                "nextWalkMessage",
            ).textContent = message;

            document.getElementById(
                "nextWalkFace",
            ).src = getWalkFace(
                nextWalkChange,
            );

            document.getElementById(
                "nextWalkChange",
            ).textContent =
                (nextWalkChange > 0 ?
                    "+" : "") +
                nextWalkChange +
                " hPa";

            setPressureBar(
                "nextPressureBar",
                nextWalkChange,
            );


            // --------------------------------
            // タイトル・時間帯
            // --------------------------------

            let nextWalkStart;
            let nextWalkEnd;

            if (
                nextWalkLabel ===
                "夕方のお散歩"
            ) {
                document.getElementById(
                    "nextWalkTitle",
                ).textContent =
                    "🌆 夕方のお散歩";

                nextWalkStart =
                    new Date(current);

                nextWalkStart.setHours(
                    11,
                    0,
                    0,
                    0,
                );

                nextWalkEnd =
                    new Date(current);

                nextWalkEnd.setHours(
                    17,
                    0,
                    0,
                    0,
                );
            } else {
                document.getElementById(
                    "nextWalkTitle",
                ).textContent =
                    "🌅 朝のお散歩";

                nextWalkStart =
                    new Date(current);

                nextWalkStart.setHours(
                    23,
                    0,
                    0,
                    0,
                );

                nextWalkEnd =
                    new Date(current);

                nextWalkEnd.setDate(
                    nextWalkEnd.getDate() + 1,
                );

                nextWalkEnd.setHours(
                    5,
                    0,
                    0,
                    0,
                );
            }


            // ========================================
            // 次のお散歩の天気
            // 開始時刻の予報を使用
            // ========================================

            const nextWalkStartData =
                hourly.find((item) =>
                    item.dt ===
                    Math.floor(
                        nextWalkStart.getTime() /
                        1000,
                    ),
                );

            if (nextWalkStartData) {
                document.getElementById(
                    "nextPressure",
                ).textContent =
                    Math.round(
                        nextWalkStartData.pressure,
                    );

                document.getElementById(
                    "nextTemperature",
                ).textContent =
                    Math.round(
                        nextWalkStartData.temp * 10,
                    ) / 10;

                document.getElementById(
                    "nextHumidity",
                ).textContent =
                    nextWalkStartData.humidity;
            }


            // ========================================
            // 次のお散歩の降水確率
            // 時間帯の最大値
            // ========================================

            const nextWalkRainProbabilities = [];

            const target =
                new Date(nextWalkStart);

            while (
                target <= nextWalkEnd
            ) {
                const targetUnix =
                    Math.floor(
                        target.getTime() / 1000,
                    );

                const item =
                    hourly.find((weather) =>
                        weather.dt === targetUnix,
                    );

                if (
                    item &&
                    item.pop !== undefined
                ) {
                    nextWalkRainProbabilities.push(
                        Math.round(
                            item.pop * 100,
                        ),
                    );
                }

                target.setHours(
                    target.getHours() + 1,
                );
            }

            if (
                nextWalkRainProbabilities.length >
                0
            ) {
                const maxRain =
                    Math.max(
                        ...nextWalkRainProbabilities,
                    );

                document.getElementById(
                    "nextRain",
                ).textContent =
                    maxRain;
            } else {
                document.getElementById(
                    "nextRain",
                ).textContent =
                    "---";
            }

            console.log(
                "次のお散歩の降水確率:",
                nextWalkRainProbabilities,
            );
        }

        return {
            currentWalkChange,
            nextWalkChange,
            nextWalkLabel,
            rainProbabilities,
        };
    } catch (error) {
        console.error(
            "One Call 4.0 エラー:",
            error,
        );
    }
}


// ========================================
// index.htmlから呼び出せるようにする
// ========================================

window.loadPressureChange =
    loadPressureChange;


// ========================================
// Push通知登録
// ========================================

async function registerPushNotification(
    user,
    db,
    doc,
    setDoc,
    serverTimestamp,
) {
    const userRef = doc(
        db,
        "users",
        user.uid,
    );

    try {
        // ① Push登録開始
        await setDoc(
            userRef,
            {
                pushDebug: {
                    step: "start",
                    updatedAt: serverTimestamp(),
                },
            },
            {merge: true},
        );

        if (!("Notification" in window)) {
            await setDoc(
                userRef,
                {
                    pushDebug: {
                        step: "notification_not_supported",
                        updatedAt: serverTimestamp(),
                    },
                },
                {merge: true},
            );

            console.error(
                "このブラウザは通知に対応していません",
            );
            return;
        }

        // ② 通知許可
        const permission =
            await Notification.requestPermission();

        console.log(
            "通知許可:",
            permission,
        );

        if (permission !== "granted") {
            await setDoc(
                userRef,
                {
                    pushDebug: {
                        step: "permission_not_granted",
                        permission: permission,
                        updatedAt: serverTimestamp(),
                    },
                },
                {merge: true},
            );

            console.log(
                "通知が許可されませんでした",
            );
            return;
        }

        // ③ Service Worker登録
        await setDoc(
            userRef,
            {
                pushDebug: {
                    step: "registering_service_worker",
                    updatedAt: serverTimestamp(),
                },
            },
            {merge: true},
        );

        const registration =
            await navigator.serviceWorker.register(
                "./service-worker.js",
            );

        console.log(
            "Service Worker登録成功！",
        );

        // ④ Push Subscription作成
        await setDoc(
            userRef,
            {
                pushDebug: {
                    step: "creating_subscription",
                    updatedAt: serverTimestamp(),
                },
            },
            {merge: true},
        );

        const subscription =
            await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey:
                    VAPID_PUBLIC_KEY,
            });

        console.log(
            "Push Subscription作成成功！",
        );

        console.log(subscription);

        // ⑤ Firestore保存
        const subscriptionData =
            subscription.toJSON();

        await setDoc(
            userRef,
            {
                pushSubscription:
                    subscriptionData,

                notificationEnabled:
                    true,

                lastUsedAt:
                    serverTimestamp(),

                pushDebug: {
                    step: "saved",
                    updatedAt: serverTimestamp(),
                },
            },
            {
                merge: true,
            },
        );

        console.log(
            "Push SubscriptionをFirestoreに保存しました！",
        );

    } catch (error) {

        console.error(
            "Push通知登録エラー:",
            error,
        );

        // エラー内容をFirestoreに保存
        await setDoc(
            userRef,
            {
                pushDebug: {
                    step: "error",
                    message:
                        error.message ||
                        String(error),
                    name:
                        error.name ||
                        "UnknownError",
                    updatedAt:
                        serverTimestamp(),
                },
            },
            {
                merge: true,
            },
        );
    }
}