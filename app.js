const VAPID_PUBLIC_KEY =
    "BB9oI0A5rn7GCwcqOlPW1yijUWUPAyYueDsUP0ClnyxQ1xgm7m3BQts_nNKYr-Y6KpSLW1WU259xajWrwpg60JE";


// ========================================
// V2 お散歩時間帯
// ========================================

function createWalkSchedule(now, type, dayOffset) {
    const schedule = new Date(now);

    schedule.setDate(schedule.getDate() + dayOffset);

    if (type === "morning") {
        const start = new Date(schedule);
        start.setHours(5, 0, 0, 0);

        const end = new Date(schedule);
        end.setHours(8, 0, 0, 0);

        return {
            type: "morning",
            label: "🌅 朝の柴んぽ",
            start,
            end,
        };
    }

    const start = new Date(schedule);
    start.setHours(17, 0, 0, 0);

    const end = new Date(schedule);
    end.setHours(20, 0, 0, 0);

    return {
        type: "evening",
        label: "🌙 夜の柴んぽ",
        start,
        end,
    };
}


/**
 * 次のお散歩とその次のお散歩の時間帯を取得します。
 */
function getWalkSchedules(now = new Date()) {
    const hour = now.getHours();

    if (hour < 8) {
        return {
            nextWalk: createWalkSchedule(now, "morning", 0),
            nextNextWalk: createWalkSchedule(now, "evening", 0),
        };
    }

    if (hour < 20) {
        return {
            nextWalk: createWalkSchedule(now, "evening", 0),
            nextNextWalk: createWalkSchedule(now, "morning", 1),
        };
    }

    return {
        nextWalk: createWalkSchedule(now, "morning", 1),
        nextNextWalk: createWalkSchedule(now, "evening", 1),
    };
}


/**
 * 指定した時間帯のhourlyデータを取得します。
 */
function getWalkWeatherData(hourly, walkSchedule) {
    return hourly.filter((item) => {
        const itemDate = new Date(item.dt * 1000);

        return (
            itemDate >= walkSchedule.start &&
            itemDate < walkSchedule.end
        );
    });
}


/**
 * 気温と湿度から基本的なコンディションを判定します。
 */
function judgeTemperatureCondition(temp, humidity) {
    // 寒さ判定
    if (temp <= 15) {
        if (temp >= 11) {
            return "🟢 快適";
        }

        if (temp >= 6) {
            return "🟡 まずまず";
        }

        if (temp >= 1) {
            return "🟠 少し注意";
        }

        return "🔴 かなり注意";
    }

    // 暑さ判定
    if (temp >= 28) {
        return "🔴 かなり注意";
    }

    if (temp >= 25) {
        return "🟠 少し注意";
    }

    if (temp >= 21) {
        if (humidity <= 60) {
            return "🌟 とても快適";
        }

        if (humidity <= 70) {
            return "🟢 快適";
        }

        return "🟡 まずまず";
    }

    if (temp >= 16) {
        if (humidity <= 39) {
            return "🟡 まずまず";
        }

        if (humidity <= 60) {
            return "🌟 とても快適";
        }

        if (humidity <= 70) {
            return "🟢 快適";
        }

        return "🟡 まずまず";
    }

    return "🟢 快適";
}


/**
 * コンディションの注意度を数値に変換します。
 */
function getConditionLevel(condition) {
    const levels = {
        "🌟 とても快適": 0,
        "🟢 快適": 1,
        "🟡 まずまず": 2,
        "🟠 少し注意": 3,
        "🔴 かなり注意": 4,
    };

    return levels[condition];
}


/**
 * 複数時間のコンディションから最も注意が必要な判定を取得します。
 */
function getWorstCondition(conditions) {
    return conditions.reduce((worst, current) => {
        if (
            getConditionLevel(current.condition) >
            getConditionLevel(worst.condition)
        ) {
            return current;
        }

        return worst;
    });
}


/**
 * 雨・雪による寒さ判定の補正を行います。
 */
function adjustColdCondition(condition, item) {
    // 15℃以下だけ寒さ補正を行う
    if (item.temp > 15) {
        return condition;
    }

    const rain = item.rain?.["1h"] || 0;
    const snow = item.snow?.["1h"] || 0;

    let correction = 0;

    // 雨：3mm/h以上で寒さを1段階強くする
    if (rain >= 3) {
        correction = 1;
    }

    // 雪：1mm/h以上で寒さを1段階強くする
    if (snow >= 1) {
        correction = 1;
    }

    if (correction === 0) {
        return condition;
    }

    const currentLevel =
        getConditionLevel(condition);

    const correctedLevel =
        Math.min(currentLevel + correction, 4);

    const conditions = [
        "🌟 とても快適",
        "🟢 快適",
        "🟡 まずまず",
        "🟠 少し注意",
        "🔴 かなり注意",
    ];

    return conditions[correctedLevel];
}


/**
 * 雨・雪の注意ポイントを判定します。
 */
function getRainSnowCaution(item) {
    const rain = item.rain?.["1h"] || 0;
    const snow = item.snow?.["1h"] || 0;

    const cautions = [];

    // 雪
    if (snow >= 3) {
        cautions.push(
            "❄️ 雪が強め・足元に注意",
        );
    } else if (snow >= 1) {
        cautions.push(
            "❄️ 雪に注意",
        );
    } else if (snow > 0) {
        cautions.push(
            "❄️ 雪が降っています",
        );
    }

    // 雨
    if (rain >= 10) {
        cautions.push(
            "🌧️ 雨が強めです",
        );
    } else if (rain > 0) {
        cautions.push(
            "🌧️ 雨が降っています",
        );
    }

    return cautions;
}


/**
 * 複数時間の雨・雪注意をまとめます。
 */
function getWalkRainSnowCautions(walkWeather) {
    const cautions = [];

    const hasRain =
        walkWeather.some((item) => {
            return (item.rain?.["1h"] || 0) > 0;
        });

    const hasHeavyRain =
        walkWeather.some((item) => {
            return (item.rain?.["1h"] || 0) >= 10;
        });

    const hasSnow =
        walkWeather.some((item) => {
            return (item.snow?.["1h"] || 0) > 0;
        });

    const hasHeavySnow =
        walkWeather.some((item) => {
            return (item.snow?.["1h"] || 0) >= 3;
        });

    if (hasHeavyRain) {
        cautions.push("🌧️ 雨が強めです");
    } else if (hasRain) {
        cautions.push("🌧️ 雨が降る時間帯があります");
    }

    if (hasHeavySnow) {
        cautions.push(
            "❄️ 雪が強め・足元に注意",
        );
    } else if (hasSnow) {
        cautions.push("❄️ 雪が降る時間帯があります");
    }

    return cautions;
}


/**
 * 湿度の注意ポイントを判定します。
 */
function getHumidityCaution(item) {
    const humidity = item.humidity;

    // 寒いときは乾燥に注意
    if (item.temp <= 15 && humidity < 40) {
        return "💧 乾燥に注意";
    }

    // 暑いときは湿度に注意
    if (item.temp >= 21 && humidity >= 60) {
        return "💧 湿度が高め";
    }

    return null;
}


/**
 * 複数時間の湿度注意をまとめます。
 */
function getWalkHumidityCautions(walkWeather) {
    const cautions = [];

    const humidityCautions =
        walkWeather.map((item) => {
            return getHumidityCaution(item);
        });

    if (humidityCautions.includes("💧 乾燥に注意")) {
        cautions.push("💧 乾燥に注意");
    }

    if (humidityCautions.includes("💧 湿度が高め")) {
        cautions.push("💧 湿度が高め");
    }

    return cautions;
}


/**
 * 風の注意ポイントを判定します。
 */
function getWindCaution(item) {
    const windSpeed = item.wind_speed || 0;

    if (windSpeed >= 8) {
        return "💨 強風に注意";
    }

    if (windSpeed >= 5) {
        return "💨 風が強め";
    }

    return null;
}


/**
 * 複数時間の風の注意をまとめます。
 */
function getWalkWindCautions(walkWeather) {
    const cautions = [];

    const windCautions =
        walkWeather.map((item) => {
            return getWindCaution(item);
        });

    if (windCautions.includes("💨 強風に注意")) {
        cautions.push("💨 強風に注意");
    } else if (
        windCautions.includes("💨 風が強め")
    ) {
        cautions.push("💨 風が強め");
    }

    return cautions;
}


/**
 * 気圧変化から注意ポイントを判定します。
 */
function getPressureCaution(change) {
    const decrease = Math.max(0, -change);

    if (decrease >= 9) {
        return "🌀 気圧がかなり変化しています";
    }

    if (decrease >= 4) {
        return "🌀 気圧が大きく変化しています";
    }

    if (decrease >= 2) {
        return "🌀 気圧が変化しています";
    }

    return null;
}


/**
 * 次のお散歩の気圧注意を判定します。
 */
function getWalkPressureCaution(
    hourly,
    walkWeather,
) {
    const cautions = [];

    walkWeather.forEach((item) => {
        const sixHoursAgoDt =
            item.dt - (6 * 60 * 60);

        const sixHoursAgo =
            hourly.find((weather) => {
                return weather.dt === sixHoursAgoDt;
            });

        if (!sixHoursAgo) {
            return;
        }

        const change =
            item.pressure -
            sixHoursAgo.pressure;

        const caution =
            getPressureCaution(change);

        if (caution) {
            cautions.push(caution);
        }
    });

    return cautions;
}

/**
 * 次のお散歩で気をつけたいことをまとめます。
 */
function getWalkCautions(
    rainSnowCautions,
    humidityCautions,
    windCautions,
    pressureCautions,
) {
    return [
        ...rainSnowCautions,
        ...humidityCautions,
        ...windCautions,
        ...pressureCautions,
    ];
}


/**
 * 雨のもちもの
 */
function getRainBelongings(
    walkWeather,
    rainProbabilities,
) {
    const belongings = [];

    const isRaining =
        walkWeather.some((item) => {
            return (item.rain?.["1h"] || 0) > 0;
        });

    const maxRainProbability =
        rainProbabilities.length > 0 ?
            Math.max(...rainProbabilities) :
            0;

    if (isRaining) {
        belongings.push("☂️ 傘");
        belongings.push("🐕 レインコート");
        belongings.push("🧻 タオル");
    } else if (maxRainProbability >= 50) {
        belongings.push("☂️ 傘");
        belongings.push("🐕 レインコート");
    } else if (maxRainProbability >= 30) {
        belongings.push("☂️ 折りたたみ傘");
    }

    return belongings;
}


/**
 * 暑いときのもちもの
 */
function getTemperatureBelongings(walkWeather) {
    const belongings = [];

    const maxTemp = Math.max(
        ...walkWeather.map((item) => item.temp),
    );

    if (maxTemp >= 28) {
        belongings.push("💧 水");
        belongings.push("🧊 ネッククーラー");
        belongings.push("🦺 クールウェア");
    } else if (maxTemp >= 25) {
        belongings.push("💧 水");
        belongings.push("🧊 ネッククーラー");
    } else if (maxTemp >= 21) {
        belongings.push("💧 水");
    }

    return belongings;
}


/**
 * 寒いときのもちもの
 */
function getColdBelongings(walkWeather) {
    const belongings = [];

    const minTemp = Math.min(
        ...walkWeather.map((item) => item.temp),
    );

    if (minTemp <= 5) {
        belongings.push("🧥 冬用ウェア");
    }

    return belongings;
}


/**
 * 雪のもちもの
 */
function getSnowBelongings(walkWeather) {
    const belongings = [];

    const hasSnow =
        walkWeather.some((item) => {
            return (item.snow?.["1h"] || 0) > 0;
        });

    if (hasSnow) {
        belongings.push("🧥 冬用ウェア");
        belongings.push("🧻 タオル");
    }

    return belongings;
}


/**
 * 日の出日の入時刻を計算
 */
function getSunriseSunset(
    date,
    latitude,
    longitude,
) {
    const rad =
        Math.PI / 180;

    const dayOfYear =
        Math.floor(
            (
                Date.UTC(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                ) -
                Date.UTC(
                    date.getFullYear(),
                    0,
                    0,
                )
            ) /
            86400000,
        );

    const declination =
        23.44 *
        Math.sin(
            rad *
            (360 / 365) *
            (dayOfYear - 81),
        );

    const latitudeRad =
        latitude * rad;

    const declinationRad =
        declination * rad;

    const cosHourAngle =
        (
            Math.cos(90.833 * rad) -
            Math.sin(latitudeRad) *
            Math.sin(declinationRad)
        ) /
        (
            Math.cos(latitudeRad) *
            Math.cos(declinationRad)
        );

    const hourAngle =
        Math.acos(cosHourAngle) /
        rad;

    const solarNoon =
        720 -
        (4 * longitude);

    const sunriseMinutes =
        solarNoon -
        (4 * hourAngle) +
        540;

    const sunsetMinutes =
        solarNoon +
        (4 * hourAngle) +
        540;

    const sunrise =
        new Date(date);

    sunrise.setHours(0, 0, 0, 0);
    sunrise.setMinutes(
        sunriseMinutes,
    );

    const sunset =
        new Date(date);

    sunset.setHours(0, 0, 0, 0);
    sunset.setMinutes(
        sunsetMinutes,
    );

    return {
        sunrise,
        sunset,
    };
}


/**
 * ライトが必要か判定
 */
function needsWalkLight(
    walkSchedule,
    sunrise,
    sunset,
) {
    if (
        walkSchedule.type === "morning" &&
        walkSchedule.start < sunrise
    ) {
        return true;
    }

    if (
        walkSchedule.type === "evening" &&
        walkSchedule.end > sunset
    ) {
        return true;
    }

    return false;
}


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

        //　データ計測に必要
        const weatherStart = performance.now();
       
        console.log("⏱️ Cloud Functions呼び出し開始");
        //　ここまで

        const result =
            await window.getWeatherData({
                latitude: Number(latitude),
                longitude: Number(longitude),
            });

            //　データ計測
            console.log(
                "⏱️ Cloud Functions＋OpenWeather:",
                Math.round(performance.now() - weatherStart),
                "ms",
            );
            //　ここまで

        const hourly =
            result.data.data;


        const schedules =
            getWalkSchedules();


        const sun =
            getSunriseSunset(
                new Date(),
                latitude,
                longitude,
            );

        console.log(
            "🌅 今日の日の出・日の入り:",
            sun.sunrise,
            sun.sunset,
        );

        const needsLight =
            needsWalkLight(
                schedules.nextWalk,
                sun.sunrise,
                sun.sunset,
            );

        console.log(
            "🔦 次のお散歩のライト:",
            needsLight,
        );

        const nextWalkWeather =
            getWalkWeatherData(
                hourly,
                schedules.nextWalk,
            );

        const nextWalkPressureCautions =
            getWalkPressureCaution(
                hourly,
                nextWalkWeather,
            );

        console.log(
            "🌀 次のお散歩の気圧注意:",
            nextWalkPressureCautions,
        );

        const nextWalkRainSnowCautions =
            getWalkRainSnowCautions(
                nextWalkWeather,
            );

        console.log(
            "🌧️ 次のお散歩の雨・雪注意:",
            nextWalkRainSnowCautions,
        );

        const nextWalkHumidityCautions =
            getWalkHumidityCautions(
                nextWalkWeather,
            );

        console.log(
            "💧 次のお散歩の湿度注意:",
            nextWalkHumidityCautions,
        );

        const nextWalkWindCautions =
            getWalkWindCautions(
                nextWalkWeather,
            );

        console.log(
            "💨 次のお散歩の風注意:",
            nextWalkWindCautions,
        );

        const nextWalkCautions =
            getWalkCautions(
                nextWalkRainSnowCautions,
                nextWalkHumidityCautions,
                nextWalkWindCautions,
                nextWalkPressureCautions,
            );

        console.log(
            "🐕 次のお散歩で気をつけたいこと:",
            nextWalkCautions,
        );

        const nextWalkCautionsElement =
            document.getElementById(
                "nextWalkCautions",
            );

        if (nextWalkCautionsElement) {
            nextWalkCautionsElement.innerHTML =
                nextWalkCautions
                    .map((caution) => {
                        return `<p>${caution}</p>`;
                    })
                    .join("");
        }

        console.log(
            "🐕 次のお散歩データ:",
            nextWalkWeather,
        );

        console.log(
            "🌅 次のお散歩の天気データ1件目:",
            nextWalkWeather[0],
        );

        const nextWalkConditions =
            nextWalkWeather.map((item) => {
                const baseCondition =
                    judgeTemperatureCondition(
                        item.temp,
                        item.humidity,
                    );

                const condition =
                    adjustColdCondition(
                        baseCondition,
                        item,
                    );

                const cautions =
                    getRainSnowCaution(item);

                return {
                    time: new Date(item.dt * 1000),
                    temp: item.temp,
                    humidity: item.humidity,
                    rain: item.rain?.["1h"] || 0,
                    snow: item.snow?.["1h"] || 0,
                    condition,
                    cautions,
                };
            });

        console.log(
            "🌡️ 次のお散歩の気温・湿度判定:",
            nextWalkConditions,
        );

        const nextWalkCondition =
            getWorstCondition(
                nextWalkConditions,
            );

        console.log(
            "🐕 次のお散歩の総合判定:",
            nextWalkCondition,
        );

        document.getElementById(
            "nextWalkCondition",
        ).textContent =
            nextWalkCondition.condition;

        const nextNextWalkWeather =
            getWalkWeatherData(
                hourly,
                schedules.nextNextWalk,
            );

        console.log(
            "🐕 その次のお散歩データ:",
            nextNextWalkWeather,
        );

        console.log(
            "🕐 hourlyの範囲:",
            new Date(hourly[0].dt * 1000),
            "〜",
            new Date(hourly[hourly.length - 1].dt * 1000),
            "件数:",
            hourly.length,
        );

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

        const currentPressureCaution =
            currentWalkChange !== null ?
                getPressureCaution(
                    currentWalkChange,
                ) :
                null;

        console.log(
            "🌀 現在のお散歩の気圧注意:",
            currentPressureCaution,
        );


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

/*
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
                */

        }


        // ========================================
        // 現在の天気
        // ========================================

        if (currentData) {
            /*
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
                */
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
/*
        const currentRain =
            rainProbabilities[0];

        document.getElementById(
            "currentRainProbability",
        ).textContent =
            currentRain !== null ?
                currentRain :
                "---";
*/

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
            /*
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
*/

            // --------------------------------
            // タイトル・時間帯
            // --------------------------------

            nextWalkStart =
                schedules.nextWalk.start;

            nextWalkEnd =
                schedules.nextWalk.end;

            document.getElementById(
                "nextWalkTitle",
            ).textContent =
                schedules.nextWalk.label;


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
                /*
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
                    */
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
/*
                document.getElementById(
                    "nextRain",
                ).textContent =
                    maxRain;
                    */
            } else {
                /*
                document.getElementById(
                    "nextRain",
                ).textContent =
                    "---";
                    */
            }

            console.log(
                "次のお散歩の降水確率:",
                nextWalkRainProbabilities,
            );

            const nextWalkRainBelongings =
                getRainBelongings(
                    nextWalkWeather,
                    nextWalkRainProbabilities,
                );

            console.log(
                "🌧️ 次のお散歩の雨対策の持ち物:",
                nextWalkRainBelongings,
            );

            const nextWalkTemperatureBelongings =
                getTemperatureBelongings(
                    nextWalkWeather,
                );

            console.log(
                "🌡️ 次のお散歩の暑さ対策の持ち物:",
                nextWalkTemperatureBelongings,
            );

            const nextWalkColdBelongings =
                getColdBelongings(
                    nextWalkWeather,
                );

            console.log(
                "❄️ 次のお散歩の寒さ対策の持ち物:",
                nextWalkColdBelongings,
            );

            const nextWalkSnowBelongings =
                getSnowBelongings(
                    nextWalkWeather,
                );

            console.log(
                "❄️ 次のお散歩の雪対策の持ち物:",
                nextWalkSnowBelongings,
            );

            const nextWalkBelongings = [
                ...nextWalkRainBelongings,
                ...nextWalkTemperatureBelongings,
                ...nextWalkColdBelongings,
                ...nextWalkSnowBelongings,
            ];

            if (needsLight) {
                nextWalkBelongings.push("🔦 ライト");
            }

            console.log(
                "🎒 次のお散歩の持ち物:",
                nextWalkBelongings,
            );

            const nextWalkBelongingsElement =
                document.getElementById(
                    "nextWalkBelongings",
                );

            if (nextWalkBelongingsElement) {
                if (nextWalkBelongings.length > 0) {
                    nextWalkBelongingsElement.innerHTML =
                        nextWalkBelongings
                            .map((item) => {
                                return `<p>${item}</p>`;
                            })
                            .join("");
                } else {
                    nextWalkBelongingsElement.innerHTML =
                        "<p>🎒 いつもの柴んぽグッズでOK！</p>";
                }
            }
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