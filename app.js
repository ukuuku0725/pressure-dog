
// グローバルAPIキー
const VAPID_PUBLIC_KEY =
    "BB9oI0A5rn7GCwcqOlPW1yijUWUPAyYueDsUP0ClnyxQ1xgm7m3BQts_nNKYr-Y6KpSLW1WU259xajWrwpg60JE";

// 待機メッセージ
const loadingMessages = [
    "🐾 お天気を確認しています",
    "🐾 雨雲をチェックしています",
    "🐾 風の強さを確認しています",
    "🐾 気温を確認しています",
    "🐾 湿度を確認しています",
    "🐾 お散歩コンディションを確認しています",
    "🐾 おすすめスタイルを考えています",
    "🐾 持ち物を確認しています",
    "🐾 今日のお散歩を準備しています",
    "🐾 柴犬レーダー起動中…",
    "🐾 お散歩日和を探しています",
    "🐾 空の様子を確認しています",
    "🐾 雨の気配を探しています",
    "🐾 お散歩の準備中です",
    "🐾 もうすぐ準備完了です",
    "🐾 しっぽを振りながら準備中…",
    "🐾 今日も楽しくお散歩しましょう",
    "🐾 柴んぽの準備をしています",
    "🐾 今日の天気を調べています",
    "🐾 お散歩にちょうどいい時間を探しています",
    "🐾 空模様を見ています",
    "🐾 お散歩のコンディションを確認中…",
    "🐾 ちょっとだけお待ちください",
    "🐾 ただいま準備中です",
    "🐾 柴んぽスタッフが準備中…",
    "🐾 お散歩情報を集めています",
    "🐾 今日のおすすめを考えています",
    "🐾 もう少しで柴んぽ開始です",
    "🐾 お天気情報を集めています",
    "🐾 柴んぽ、もうすぐです！"
];


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
            label: "朝のさんぽ",
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
        label: "夜のさんぽ",
        start,
        end,
    };
}


/**
 * 次のお散歩とその次のお散歩の時間帯を取得します。
 */
function getWalkSchedules(now = new Date()) {

    console.log(
        "🕐 お散歩スケジュール判定:",
        now,
        "時:",
        now.getHours(),
    );

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
 * 気温から基本的なコンディションを判定します。
 */
function judgeTemperatureCondition(temp, humidity) {
    // 寒さ判定
    if (temp <= 15) {
        if (temp >= 11) {
            return "🟢 快適";
        }

        if (temp >= 3) {
            return "🟡 まずまず";
        }

        return "🟠 少し注意";
    }

    // 暑さ判定
    if (temp >= 30) {
        return "🔴 かなり注意";
    }

    // 26〜29℃は湿度によってはかなり危険にする
    if (temp >= 26) {
        if (humidity >= 70) {
            return "🔴 かなり注意";
        }

        return "🟠 少し注意";
    }

    // 24〜25℃は湿度によっては判定を一つ下げる
    if (temp >= 24) {
        if (humidity >= 70) {
            return "🟡 まずまず";
        }

        return "🟢 快適";
    }

    // 21〜23℃湿度によっては判定を一つ下げる
    if (temp >= 21) {
        if (humidity >= 70) {
            return "🟢 快適";
        }

        return "🌟 とても快適";
    }

    // 16〜20℃
    if (temp >= 16) {
        return "🌟 とても快適";
    }

    return "🟢 快適";
}


/**
 * 天気に応じたアイコン
 */
function getWeatherIcon(item) {

    const weatherId =
        item.weather?.[0]?.id || 800;

    if (weatherId >= 200 && weatherId < 300) {
        return "⛈️";
    }

    if (weatherId >= 300 && weatherId < 400) {
        return "🌦️";
    }

    if (weatherId >= 500 && weatherId < 600) {
        return "🌧️";
    }

    if (weatherId >= 600 && weatherId < 700) {
        return "❄️";
    }

    if (weatherId >= 700 && weatherId < 800) {
        return "🌫️";
    }

    if (weatherId === 800) {
        return "☀️";
    }

    if (weatherId === 801) {
        return "🌤️";
    }

    if (weatherId === 802) {
        return "⛅";
    }

    if (weatherId === 803 || weatherId === 804) {
        return "☁️";
    }

    return "🌤️";
}

/**
 * コンディションに応じたメッセージを取得します。
 */
function getConditionMessage(condition) {

    const messages = {
        "🌟 とても快適": "素晴らしいコンディションです",
        "🟢 快適": "気持ちよくお散歩できそう",
        "🟡 まずまず": "お散歩を楽しめそうです",
        "🟠 少し注意": "様子をみてお散歩を",
        "🔴 かなり注意": "お散歩は短時間で",
    };

    return messages[condition] || "";
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
 * 雨・雪・風による判定の補正を行います。
 */
function adjustWeatherCondition(condition, item) {
    const rain = item.rain?.["1h"] || 0;
    const snow = item.snow?.["1h"] || 0;
    const wind = item.wind_speed || 0;

    const currentLevel =
        getConditionLevel(condition);

    let correctedLevel = currentLevel;

    // --------------------------------
    // 雨
    // --------------------------------

    // 3mm/h以上なら最低「まずまず」
    if (rain >= 1) {
        correctedLevel = Math.max(
            correctedLevel,
            2
        );
    }
    // 5mm/h以上なら最低「少し注意」
    if (rain >= 5) {
        correctedLevel = Math.max(
            correctedLevel,
            3
        );
    }

    // 10mm/h以上ならさらに1段階下げる
    if (rain >= 10) {
        correctedLevel = Math.min(
            correctedLevel + 1,
            4
        );
    }

    // --------------------------------
    // 雪
    // --------------------------------

    // 1mm/h以上で1段階下げる
    if (snow >= 1) {
        correctedLevel = Math.min(
            correctedLevel + 1,
            4
        );
    }

    // --------------------------------
    // 風
    // --------------------------------

    // 8m/s以上なら最低「少し注意」
    if (wind >= 8) {
        correctedLevel = Math.max(
            correctedLevel,
            3
        );
    }

    // 10m/s以上ならさらに1段階下げる
    if (wind >= 10) {
        correctedLevel = Math.min(
            correctedLevel + 1,
            4
        );
    }

    // --------------------------------
    // 補正なし
    // --------------------------------

    if (correctedLevel === currentLevel) {
        return condition;
    }

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
        cautions.push({
            icon: "./images/cautions/snow-heavy.png",
            message: "足元注意",
            value: `${snow.toFixed(1)} mm/h`,
        });
    } else if (snow > 0) {
        cautions.push({
            icon: "./images/cautions/snow.png",
            message: "雪に注意",
            value: `${snow.toFixed(1)} mm/h`,
        });
    }

    // 雨
    if (rain >= 10) {
        cautions.push({
            icon: "./images/cautions/rain-heavy.png",
            message: "雨が強め",
            value: `${rain.toFixed(1)} mm/h`,
        });
    } else if (rain > 0) {
        cautions.push({
            icon: "./images/cautions/rain.png",
            message: "雨が降る",
            value: `${rain.toFixed(1)} mm/h`,
        });
    }

    return cautions;
}


/**
 * 複数時間の雨・雪注意をまとめます。
 */
function getWalkRainSnowCautions(walkWeather) {
    const cautions = [];

    const maxRain =
        Math.max(
            ...walkWeather.map((item) => {
                return item.rain?.["1h"] || 0;
            }),
            0,
        );

    const maxSnow =
        Math.max(
            ...walkWeather.map((item) => {
                return item.snow?.["1h"] || 0;
            }),
            0,
        );

        // 雨
        if (maxRain >= 10) {
            cautions.push({
                icon:  "./images/cautions/rain-heavy.png",
                message: "雨が強め",
                value: `${maxRain.toFixed(1)} mm/h`,
                priority: 2,
            });
        } else if (maxRain > 0) {
            cautions.push({
                icon: "./images/cautions/rain.png",
                message: "雨の時間あり",
                value: `${maxRain.toFixed(1)} mm/h`,
                priority: 6,
            });
        }

        // 雪
        if (maxSnow >= 3) {
            cautions.push({
                icon: "./images/cautions/snow-heavy.png",
                message: "足元注意",
                value: `${maxSnow.toFixed(1)} mm/h`,
                priority: 1,
            });
        } else if (maxSnow > 0) {
            cautions.push({
                icon: "./images/cautions/snow.png",
                message: "雪の時間あり",
                value: `${maxSnow.toFixed(1)} mm/h`,
                priority: 5,
            });
        }

    return cautions;
}

/**
 * 暑さの注意を判定します。
 */
function getHeatCaution(item) {
    const temp = Math.round(item.temp);

    if (temp >= 25) {
        return {
            icon: "./images/cautions/heat.png",
            message: "暑さに注意",
            value: `${temp}℃`,
        };
    }

    return null;
}

/**
 * 複数時間の暑さの注意をまとめます。
 */
function getWalkHeatCaution(walkWeather) {
    const heatCautions = walkWeather
        .map((item) => getHeatCaution(item))
        .filter(Boolean);

    if (heatCautions.length === 0) {
        return [];
    }

    const hottest = heatCautions.reduce(
        (highest, current) => {
            const highestValue =
                parseFloat(highest.value);

            const currentValue =
                parseFloat(current.value);

            return currentValue > highestValue
                ? current
                : highest;
        },
    );

    hottest.priority = 3;

    return [hottest];
}

/**
 * 湿度の注意ポイントを判定します。
 */
function getHumidityCaution(item) {
    const humidity = item.humidity;

    if (item.temp <= 15 && humidity < 40) {
        return {
            icon: "./images/cautions/dry.png",
            message: "乾燥に注意",
            value: `${humidity}%`,
        };
    }

    if (item.temp >= 21 && humidity >= 60) {
        return {
            icon: "./images/cautions/humidity-high.png",
            message: "湿度が高め",
            value: `${humidity}%`,
        };
    }

    return null;
}


/**
 * 複数時間の湿度注意をまとめます。
 */
function getWalkHumidityCautions(walkWeather) {
    const humidityCautions =
        walkWeather
            .map((item) => {
                return getHumidityCaution(item);
            })
            .filter(Boolean);

    if (humidityCautions.length === 0) {
        return [];
    }

    // 乾燥に注意する時間があれば表示
    const dryCaution =
        humidityCautions.find((caution) => {
            return caution.message === "乾燥に注意";
        });

    if (dryCaution) {
        dryCaution.priority = 7;
        return [dryCaution];
    }

    // 湿度が高めの場合は、最も湿度が高いものを表示
    const highHumidityCaution =
        humidityCautions.reduce(
            (highest, current) => {

                const highestValue =
                    parseFloat(highest.value);

                const currentValue =
                    parseFloat(current.value);

                return currentValue > highestValue
                    ? current
                    : highest;
            },
        );

    highHumidityCaution.priority = 7;

    return [highHumidityCaution];
}

/**
 * 風の注意ポイントを判定します。
 */
function getWindCaution(item) {
    const windSpeed = item.wind_speed || 0;

    if (windSpeed >= 8) {
        return {
            icon: "./images/cautions/strong-wind.png",
            message: "強風に注意",
            value: `${windSpeed.toFixed(1)} m/s`,
        };
    }

    if (windSpeed >= 5) {
        return {
            icon: "./images/cautions/strong-wind.png",
            message: "風が強め",
            value: `${windSpeed.toFixed(1)} m/s`,
        };
    }

    return null;
}


/**
 * 複数時間の風の注意をまとめます。
 */
function getWalkWindCautions(walkWeather) {
    const windCautions =
        walkWeather
            .map((item) => {
                return getWindCaution(item);
            })
            .filter(Boolean);

    if (windCautions.length === 0) {
        return [];
    }

    // 強風が1時間でもあれば表示
    const strongWind =
        windCautions.find((caution) => {
            return caution.message === "強風に注意";
        });

    if (strongWind) {
        strongWind.priority = 4;
        return [strongWind];
    }

    // 「風が強め」は注意ポイントには表示しない
    return [];
}


/**
 * 気圧変化から注意ポイントを判定します。
 */
function getPressureCaution(change) {
    const decrease = Math.max(0, -change);

    if (decrease >= 9) {
        return {
            icon: "./images/cautions/pressure.png",
            message: "気圧がかなり変化",
            value: `${change.toFixed(1)} hPa`,
        };
    }

    if (decrease >= 4) {
        return {
            icon: "./images/cautions/pressure.png",
            message: "気圧変化あり",
            value: `${change.toFixed(1)} hPa`,
        };
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
    let strongestChange = null;

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

        if (
            strongestChange === null ||
            Math.abs(change) >
                Math.abs(strongestChange)
        ) {
            strongestChange = change;
        }
    });

    if (strongestChange === null) {
        return [];
    }

   const caution =
    getPressureCaution(
        strongestChange,
    );

    if (!caution) {
        return [];
    }

    caution.priority = 8;

    return [caution];
}


/**
 * 次のお散歩で気をつけたいことをまとめます。
 */
function getWalkCautions(
    heatCautions,
    rainSnowCautions,
    humidityCautions,
    windCautions,
    pressureCautions,
) {
    const cautions = [
        ...heatCautions,
        ...rainSnowCautions,
        ...humidityCautions,
        ...windCautions,
        ...pressureCautions,
    ];

    return cautions.sort((a, b) => {
        return a.priority - b.priority;
    });
}

/**
 * おすすめコーデ　優先度高い順
 */
function getWalkOutfit(walkWeather, cautions) {

    console.log(
        "👕 コーデ判定用の天気:",
        walkWeather,
    );

    // ❄️ 雪
    const hasSnow =
        walkWeather.some((item) => {
            return (item.snow?.["1h"] || 0) > 0;
        });

    if (hasSnow) {
        return "./images/outfits/snow.png";
    }

    console.log(
        "🌧️ コーデ判定の雨量:",
        walkWeather.map((item) => {
            return item.rain?.["1h"] || 0;
        }),
    );

    // 🌧️ 雨
    const hasRain =
        walkWeather.some((item) => {
            return (item.rain?.["1h"] || 0) > 1;
        });

    if (hasRain) {
        return "./images/outfits/rain.png";
    }

    // 🌡️ 暑さ
    const hasHeat =
        cautions.some((caution) => {
            return caution.message === "暑さに注意";
        });

    if (hasHeat) {
        return "./images/outfits/hot.png";
    }

    // 🧣 寒さ
    const hasCold =
        walkWeather.some((item) => {
            return item.temp <= 10;
        });

    if (hasCold) {
        return "./images/outfits/cold.png";
    }

    // 🐕 いつもの服装
    return "./images/outfits/normal.png";
}

function getWalkOutfitBackground(outfit) {
    const backgroundMap = {
        "./images/outfits/normal.png":
            "./images/back/back_1.png",

        "./images/outfits/hot.png":
            "./images/back/back_2.png",

        "./images/outfits/cold.png":
            "./images/back/back_3.png",

        "./images/outfits/rain.png":
            "./images/back/back_4.png",

        "./images/outfits/snow.png":
            "./images/back/back_5.png",
    };

    return backgroundMap[outfit]
        || "./images/back/back_1.png";
}


/**
 * 雨のもちもの
 */
function getRainBelongings(walkWeather, rainProbabilities) {
    const belongings = [];

    const isRaining =
        walkWeather.some(
            (item) => (item.rain?.["1h"] || 0) > 0
        );

    const maxRainProbability =
        rainProbabilities.length > 0
            ? Math.max(...rainProbabilities)
            : 0;

    if (isRaining) {
        belongings.push("☂️ 傘");
        belongings.push("🧻 タオル");
    } else if (maxRainProbability >= 50) {
        belongings.push("☂️ 傘");
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
        belongings.push("🧢 夏帽子");
        belongings.push("🧊 ネッククーラー");
    } else if (maxTemp >= 25) {
        belongings.push("💧 水");
        belongings.push("🧢 夏帽子");
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

    const maxWind = Math.max(
        ...walkWeather.map(
            (item) => item.wind_speed || 0,
        ),
    );

    // 5℃以下 → 手袋
    if (minTemp <= 5) {
        belongings.push("🧤 手袋");
    }

    // 0℃以下 → マフラー
    if (minTemp <= 0) {
        belongings.push("🧣 マフラー");
    }

    // 0℃以下 ＋ 風5m/s以上 → 帽子
    if (
        minTemp <= 0 &&
        maxWind >= 5
    ) {
        belongings.push("🧢 防寒帽");
    }

    return belongings;
}


/**
 * 雪のもちもの
 */
function getSnowBelongings(walkWeather) {
    const belongings = [];

    const hasSnow =
        walkWeather.some(
            (item) => (item.snow?.["1h"] || 0) > 0
        );

    if (hasSnow) {
        belongings.push("🥾 長靴");
        belongings.push("🔥 ホッカイロ");
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
// 気圧変化・天気データ取得
// ========================================

async function loadPressureChange() {

    // --------------------------------
    // 柴んぽ準備中メッセージ
    // --------------------------------

    const loadingMessageElement =
        document.getElementById(
            "loadingMessage"
        );

    if (loadingMessageElement) {

        const randomIndex =
            Math.floor(
                Math.random() *
                loadingMessages.length
            );

        loadingMessageElement.textContent =
            loadingMessages[randomIndex];
    }


    console.time("loadPressureChange");

    console.time("localStorage取得");

    const latitude =
        localStorage.getItem("latitude");

    const longitude =
        localStorage.getItem("longitude");

    if (!latitude || !longitude) {

        console.error("緯度・経度がありません");
        return;
    }

    console.timeEnd("localStorage取得");

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
    // weatherCacheを優先して使用
    // --------------------------------

    try {

        const CACHE_MAX_AGE =
            2 * 60 * 60 * 1000; // 2時間

        const cache =
            window.weatherCache;

        let hourly = null;

        const cacheUpdatedAt =
            cache?.updatedAt?.toDate
                ? cache.updatedAt.toDate()
                : null;

        const cacheAge =
            cacheUpdatedAt
                ? Date.now() - cacheUpdatedAt.getTime()
                : Infinity;

        console.log("weatherCache判定:", {
            cacheExists: !!cache,
            dataIsArray: Array.isArray(cache?.data),
            dataLength: cache?.data?.length,
            updatedAt: cache?.updatedAt,
            cacheUpdatedAt: cacheUpdatedAt,
            cacheAge: cacheAge,
            cacheAgeMinutes: Math.round(cacheAge / 1000 / 60),
        });

        const cacheLocationMatches =
            Number(cache?.latitude) === Number(latitude) &&
            Number(cache?.longitude) === Number(longitude);

        // --------------------------------
        // 新しいキャッシュがあれば使用
        // --------------------------------

        if (
        cache &&
        Array.isArray(cache.data) &&
        cache.data.length > 0 &&
        cacheUpdatedAt &&
        cacheAge <= CACHE_MAX_AGE &&
        cacheLocationMatches
        ) {

            hourly =
                cache.data;

            console.log(
                "✅ weatherCacheを使用します",
            );

            console.log(
                "キャッシュ更新日時:",
                cacheUpdatedAt,
            );

            console.log(
                "キャッシュ経過時間:",
                Math.round(
                    cacheAge / 1000,
                ),
                "秒",
            );

            console.log(
                "データ件数:",
                hourly.length,
            );

            
            // // --------------------------------
            // // 1分データ テスト
            // // --------------------------------

            // const minutelyResult =
            //     await window.testMinutelyWeather({
            //         latitude: Number(latitude),
            //         longitude: Number(longitude),
            //     });

            // console.log(
            //     "🌧️ 1分データテスト結果:",
            //     minutelyResult,
            // );


            // // --------------------------------
            // // 雨が降り始める時間を確認
            // // --------------------------------

            // const minutelyData =
            //     minutelyResult.data.data;

            // const firstRain =
            //     minutelyData.find((item) => {
            //         return item.precipitation > 0;
            //     });

            // if (firstRain) {

            //     const now =
            //         Math.floor(Date.now() / 1000);

            //     const minutesUntilRain =
            //         Math.round(
            //             (firstRain.dt - now) / 60
            //         );

            //     console.log(
            //         "🌧️ 雨が降り始めるまで:",
            //         minutesUntilRain,
            //         "分後",
            //     );

            // } else {

            //     console.log(
            //         "🌧️ 60分以内に雨の予報なし",
            //     );
            // }


        } else {

            // --------------------------------
            // キャッシュがない・古い場合
            // Cloud Functions経由で取得
            // --------------------------------

            const weatherStart =
                performance.now();

            console.log(
                "☁️ weatherCacheがない・古いため、Cloud Functionsから取得します",
            );

            const result =
                await window.getWeatherData({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                });

            console.log(
                "⏱️ Cloud Functions＋OpenWeather:",
                Math.round(
                    performance.now() - weatherStart,
                ),
                "ms",
            );

            hourly =
                result.data.data;

            // 今回取得した天気データをキャッシュとして更新
            window.weatherCache = {
                data: hourly,
                latitude: Number(latitude),
                longitude: Number(longitude),
                updatedAt: new Date(),
            };

            console.log(
                "Cloud Functions経由で天気データ取得成功！",
            );

            console.log(
                "データ件数:",
                hourly.length,
            );
        }


        // // --------------------------------
        // // 1分データ
        // // --------------------------------

        // const minutelyResult =
        //     await window.testMinutelyWeather({
        //         latitude: Number(latitude),
        //         longitude: Number(longitude),
        //     });

        // console.log(
        //     "🌧️ 1分データテスト結果:",
        //     minutelyResult,
        // );

        // const minutelyData =
        //     minutelyResult.data.data;

        // const firstRain =
        //     minutelyData.find((item) => {
        //         return item.precipitation > 0;
        //     });

        // const rainForecastElement =
        //     document.getElementById(
        //         "rainForecastMessage",
        //     );

        // if (rainForecastElement) {

        //     if (firstRain) {

        //         const now =
        //             Math.floor(Date.now() / 1000);

        //         const minutesUntilRain =
        //             Math.round(
        //                 (firstRain.dt - now) / 60
        //             );

        //         rainForecastElement.innerHTML = `
        //             <img
        //                 src="./images/cautions/raintime.png"
        //                  alt="雨予報"
        //                  class="rain-forecast-icon"
        //             >
        //             <span class="rain-forecast-text">
        //                 ${minutesUntilRain}分後に雨が降る予報です
        //             </span>
        //             `;

        //     } else {
        //         rainForecastElement.style.display = "none";
        //         rainForecastElement.innerHTML = "";

        //     }
        // }


        // 6時間後(現在)のデータを格納
        const currentWeather =
            hourly[6];

        console.log(
            "🌤️ 今の天気:",
            currentWeather,
        );

        const currentWeatherTime =
            new Date(
                currentWeather.dt * 1000,
            );

        console.log(
            "🌤️ 現在の天気データ時刻:",
            currentWeatherTime,
        );


        // ========================================
        // このあとの天気
        // ========================================

        const futureWeather =
            hourly.slice(7);

        console.log(
            "🌤️ このあとの天気:",
            futureWeather,
        );

        // ========================================
        // 33時間予報を表示
        // ========================================

        const futureWeatherElement =
            document.getElementById(
                "futureWeather",
            );

        if (futureWeatherElement) {

            const times =
                futureWeather.map((item, index) => {

                    const time =
                        new Date(item.dt * 1000);

                    const today =
                        new Date();

                    const todayDate =
                        new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate(),
                        );

                    const targetDate =
                        new Date(
                            time.getFullYear(),
                            time.getMonth(),
                            time.getDate(),
                        );

                    const dayDifference =
                        Math.round(
                            (
                                targetDate -
                                todayDate
                            ) /
                            (24 * 60 * 60 * 1000),
                        );

                    let dayLabel = "";

                    // 前の時間データ
                    const previousItem =
                        futureWeather[index - 1];

                    let isNewDay = false;

                    if (previousItem) {

                        const previousTime =
                            new Date(
                                previousItem.dt * 1000,
                            );

                        isNewDay =
                            previousTime.getDate() !==
                            time.getDate();

                    } else {

                        // 最初のデータ
                        isNewDay = true;
                    }

                    if (isNewDay) {

                        if (dayDifference === 0) {
                            dayLabel = "今日 ";
                        } else if (dayDifference === 1) {
                            dayLabel = "明日 ";
                        } else if (dayDifference === 2) {
                            dayLabel = "明後日 ";
                        }
                    }

                    return (
                        dayLabel +
                        time
                            .getHours()
                            .toString()
                            .padStart(2, "0") +
                        ":00"
                    );
                });

            const temperatures =
                futureWeather.map((item) =>
                    `${Math.round(item.temp.toFixed(1))}℃`
                );

            const humidities =
                futureWeather.map((item) =>
                    `${item.humidity}%`
                );

            const rains =
                futureWeather.map((item) => {

                    const rain =
                        item.rain?.["1h"] || 0;

                    return `${rain.toFixed(1)}mm`;
                });

            const rainProbabilities =
                futureWeather.map((item) => {

                    const probability =
                        item.pop !== undefined
                            ? Math.round(
                                item.pop * 10,
                            ) * 10
                            : 0;

                    return `${probability}%`;
                });

            const winds =
                futureWeather.map((item) =>
                    `${item.wind_speed.toFixed(1)}m/s`
                );

            const pressures =
                futureWeather.map((item) =>
                    `${item.pressure}`
                );

            
            futureWeatherElement.innerHTML = `
                <div class="future-weather-cards">

                    ${times
                        .map((time, index) => {

                            const temperature =
                                temperatures[index];

                            const rain =
                                rains[index];

                            const rainProbability =
                                rainProbabilities[index];

                            const wind =
                                winds[index];

                            const pressure =
                                pressures[index];

                            const weatherItem =
                                futureWeather[index];

                            return `
                                <div class="future-weather-card">

                                    <div class="future-weather-time">
                                        ${time.split(":")[0]}
                                    </div>

                                    <div class="future-weather-main">
                                        <span class="future-weather-icon">
                                            ${getWeatherIcon(weatherItem)}
                                        </span>

                                        <span class="future-weather-temp">
                                            ${temperature}
                                        </span>
                                    </div>

                                    <div class="future-weather-pop">
                                        ☂️ ${rainProbability}
                                    </div>

                                    <div class="future-weather-details">

                                        <div>
                                            🌧️ ${rain}
                                        </div>

                                        <div>
                                            💨 ${wind}
                                        </div>

                                        <div>
                                            🌀 ${pressure}
                                        </div>

                                    </div>

                                    <div class="future-weather-toggle">
                                        <span>詳細</span>
                                        <span class="future-weather-arrow">▼</span>
                                    </div>

                                </div>
                            `;
                        })
                        .join("")}

                </div>
            `;


            document
                .querySelectorAll(".future-weather-cards")
                .forEach((group) => {

                    const cards =
                        group.querySelectorAll(
                            ".future-weather-card",
                        );

                    cards.forEach((card) => {

                        card.addEventListener("click", () => {

                            const isOpen =
                                card.classList.contains("open");

                            cards.forEach((targetCard) => {

                                targetCard.classList.toggle(
                                    "open",
                                    !isOpen,
                                );

                            });

                        });

                    });

                });

        }

        const currentRain =
            currentWeather.rain?.["1h"] || 0;

        console.log(
            "🌧️ 現在の降水量:",
            currentRain,
        );

        let currentRainText;

        if (currentRain > 0) {
            currentRainText =
                `🌧️ 雨 ${currentRain.toFixed(1)}mm`;
        } else {
            currentRainText =
                "🌤️ 雨なし";
        }
        
        const sixHoursAgoTarget =
            currentWeather.dt -
            (6 * 60 * 60);

        const sixHoursAgo =
            hourly.reduce(
                (closest, weather) => {

                    if (!closest) {
                        return weather;
                    }

                    const currentDiff =
                        Math.abs(
                            weather.dt -
                            sixHoursAgoTarget,
                        );

                    const closestDiff =
                        Math.abs(
                            closest.dt -
                            sixHoursAgoTarget,
                        );

                    if (
                        currentDiff <
                        closestDiff
                    ) {
                        return weather;
                    }

                    return closest;
                },
                null,
            );

        let currentPressureChange = null;

        if (sixHoursAgo) {
            currentPressureChange =
                currentWeather.pressure -
                sixHoursAgo.pressure;
        }

        console.log(
            "🌀 現在の気圧変化:",
            currentPressureChange,
        );

        document.getElementById(
            "currentWeatherIcon",
        ).textContent =
            getWeatherIcon(currentWeather);

        document.getElementById(
            "currentWeatherDescription",
        ).textContent =
            currentWeather.weather[0].description;

        document.getElementById(
            "currentWeatherTemp",
        ).textContent =
            `${Math.round(currentWeather.temp)}℃`;

        document.getElementById(
            "currentPrecipitation",
        ).innerHTML =
            `<span class="precipitation-label">降水確率</span> 
            ${Math.round(currentWeather.pop * 10) * 10}%`;

        document.getElementById("currentWeather").innerHTML =
            `<div class="current-weather-details">
                <span>🙂 体感 ${Math.round(currentWeather.feels_like.toFixed(1))}℃</span>
                <span>${currentRainText}</span>
                <span>💧 湿度 ${currentWeather.humidity}%</span>
                <span>💨 風 ${currentWeather.wind_speed.toFixed(1)}m/s</span>
                <span>🌀 気圧 ${currentWeather.pressure}hPa</span>
            </div>`;


        console.log(
            "🕐 hourlyの時刻:",
            hourly.map((item) => {
                return new Date(
                    item.dt * 1000,
                );
            }),
        );

        console.log(
            "🕐 hourlyの範囲:",
            new Date(hourly[0].dt * 1000),
            "〜",
            new Date(hourly[hourly.length - 1].dt * 1000),
            "件数:",
            hourly.length,
        );

        const currentWeatherCautions = [];

        // 💧 湿度
        const humidityCaution =
            getHumidityCaution(
                currentWeather,
            );

        if (humidityCaution) {
            currentWeatherCautions.push(
                humidityCaution,
            );
        }

        // 🌡️ 暑さ
        const heatCaution =
            getHeatCaution(
                currentWeather,
            );

        if (heatCaution) {
            currentWeatherCautions.push(
                heatCaution,
            );
        }

        console.log(
            "🌡️ 現在気温:",
            currentWeather.temp,
        );

        // 💨 風
        const windCaution =
            getWindCaution(
                currentWeather,
            );

        if (windCaution) {
            currentWeatherCautions.push(
                windCaution,
            );
        }

        // 🌧️ 雨・雪
        const rainSnowCautions =
            getRainSnowCaution(
                currentWeather,
            );

        currentWeatherCautions.push(
            ...rainSnowCautions,
        );

        // 🌀 気圧
        const pressureCaution =
            getPressureCaution(
                currentPressureChange,
            );

        if (pressureCaution) {
            currentWeatherCautions.push(
                pressureCaution,
            );
        }

        console.log(
            "⚠️ 今の天気の注意ポイント:",
            currentWeatherCautions,
        );

        const currentWeatherCautionsElement =
            document.getElementById(
                "currentWeatherCautions",
            );

        if (currentWeatherCautionsElement) {

            if (
                currentWeatherCautions.length > 0
            ) {
                currentWeatherCautionsElement.innerHTML = `
                    <div class="caution-cards">

                        ${currentWeatherCautions
                            .map((caution) => {
                                return `
                                    <div class="caution-card">

                                        <div class="caution-icon">
                                            <img
                                                src="${caution.icon}"
                                                alt=""
                                            >
                                        </div>

                                        <div class="caution-text">

                                            <div class="caution-message">
                                                ${caution.message}
                                            </div>

                                            <div class="caution-value">
                                                (${caution.value})
                                            </div>

                                        </div>

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;
            } else {
                currentWeatherCautionsElement.innerHTML =
                    "<p>今のところ注意することはなさそうです</p>";
            }
        }


        // --------------------------------
        // タブボタンの文言
        // --------------------------------

        const schedules = getWalkSchedules();

        const today = new Date();

        const nextWalkDateLabel =
            schedules.nextWalk.start.toDateString() !== today.toDateString()
                ? "翌 "
                : "";

        const nextNextWalkDateLabel =
            schedules.nextNextWalk.start.toDateString() !== today.toDateString()
                ? "翌 "
                : "";


        // --------------------------------
        // 次の散歩タブ
        // --------------------------------

        const nextWalkTab =
            document.getElementById("nextWalkTab");

        nextWalkTab.classList.remove(
            "morning-walk-tab",
            "evening-walk-tab"
        );

        const nextWalkIcon =
            schedules.nextWalk.label === "朝のさんぽ"
                ? "./images/icons/tabicon-asa.png"
                : "./images/icons/tabicon-yoru.png";

        const nextWalkClass =
            schedules.nextWalk.label === "朝のさんぽ"
                ? "morning-walk-tab"
                : "evening-walk-tab";

        nextWalkTab.classList.add(nextWalkClass);

        nextWalkTab.innerHTML =
            `<span class="walk-tab-label">` +
                `<img src="${nextWalkIcon}" alt="">` +
                `${schedules.nextWalk.label}` +
            `</span>` +
            `<span class="walk-tab-time">${nextWalkDateLabel}` +
                `${schedules.nextWalk.start.getHours()}:00〜` +
                `${schedules.nextWalk.end.getHours()}:00` +
            `</span>`;


        const nextWalkConditionArea =
            document.querySelector(".next-walk-condition");


        // --------------------------------
        // 次の次の散歩タブ
        // --------------------------------

        const nextNextWalkTab =
            document.getElementById("nextNextWalkTab");

        nextNextWalkTab.classList.remove(
            "morning-walk-tab",
            "evening-walk-tab"
        );

        const nextNextWalkIcon =
            schedules.nextNextWalk.label === "朝のさんぽ"
                ? "./images/icons/tabicon-asa.png"
                : "./images/icons/tabicon-yoru.png";

        const nextNextWalkClass =
            schedules.nextNextWalk.label === "朝のさんぽ"
                ? "morning-walk-tab"
                : "evening-walk-tab";

        nextNextWalkTab.classList.add(nextNextWalkClass);

        nextNextWalkTab.innerHTML =
            `<span class="walk-tab-label">` +
                `<img src="${nextNextWalkIcon}" alt="">` +
                `${schedules.nextNextWalk.label}` +
            `</span>` +
            `<span class="walk-tab-time">${nextNextWalkDateLabel}` +
                `${schedules.nextNextWalk.start.getHours()}:00〜` +
                `${schedules.nextNextWalk.end.getHours()}:00` +
            `</span>`;


        // ========================================
        // 次の柴んぽ処理
        // ========================================

        // --------------------------------
        // 次のお散歩 タイトル・時間帯
        // --------------------------------

        nextWalkStart =
            schedules.nextWalk.start;

        nextWalkEnd =
            schedules.nextWalk.end;

        const nextWalkWeather =
            getWalkWeatherData(
                hourly,
                schedules.nextWalk,
            );

        console.log(
            "🐕 V2 次のお散歩スケジュール:",
            schedules.nextWalk,
        );

        
    // --------------------------------
    // 次の柴んぽ処理　コンディション
    // --------------------------------

    const nextWalkConditions =
        nextWalkWeather.map((item) => {
            const baseCondition =
                judgeTemperatureCondition(
                    item.temp,
                    item.humidity,
                );

            const condition =
                adjustWeatherCondition(
                    baseCondition,
                    item,
                );

            const conditionMessage =
                getConditionMessage(
                    condition,
                );

            console.log(
                "次の柴んぽ weather:",
                item.weather,
            );

            const cautions =
                getRainSnowCaution(item);

            return {
                time: new Date(item.dt * 1000),
                temp: item.temp,
                humidity: item.humidity,
                pressure: item.pressure,
                rain: item.rain?.["1h"] || 0,
                snow: item.snow?.["1h"] || 0,
                condition,
                conditionMessage,
                weatherDescription:
                    item.weather?.[0]?.description || "",
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

        const nextWalkConditionImage =
            document.getElementById("nextWalkCondition");

        const conditionImageMap = {
            "🌟 とても快適": "./images/judges/judge_1.png",
            "🟢 快適": "./images/judges/judge_2.png",
            "🟡 まずまず": "./images/judges/judge_3.png",
            "🟠 少し注意": "./images/judges/judge_4.png",
            "🔴 かなり注意": "./images/judges/judge_5.png",
        };

        nextWalkConditionImage.src =
            conditionImageMap[nextWalkCondition.condition];

        nextWalkConditionImage.alt =
            nextWalkCondition.condition;

        document.getElementById(
            "nextWalkWeatherDescription",
        ).style.display = "none";

            
        // --------------------------------
        // 次のお散歩の代表値
        // --------------------------------

        const nextWalkMaxTemp =
            Math.max(
                ...nextWalkWeather.map(
                    (item) => item.temp,
                ),
            );

        const nextWalkMaxHumidity =
            Math.max(
                ...nextWalkWeather.map(
                    (item) => item.humidity,
                ),
            );

        const nextWalkMaxRain =
            Math.max(
                ...nextWalkWeather.map(
                    (item) =>
                        item.rain?.["1h"] || 0,
                ),
            );

        const nextWalkMaxWind =
            Math.max(
                ...nextWalkWeather.map(
                    (item) =>
                        item.wind_speed || 0,
                ),
            );

        console.log(
            "📊 次のお散歩の代表値:",
            {
                maxTemp: nextWalkMaxTemp,
                maxHumidity: nextWalkMaxHumidity,
                maxRain: nextWalkMaxRain,
                maxWind: nextWalkMaxWind,
            },
        );

        document.getElementById(
            "nextWalkMaxTemp",
        ).textContent =
            `${Math.round(nextWalkMaxTemp)}℃`

        
        // --------------------------------
        // 次のお散歩時間帯の３時間天気
        // --------------------------------

        document.getElementById(
            "nextWalkHourlyWeather",
        ).innerHTML = `
            <div class="walk-hourly-cards">

                ${nextWalkWeather
                    .map((item) => {

                        const time =
                            new Date(item.dt * 1000);

                        const hour =
                            time
                                .getHours()
                                .toString()
                                .padStart(2, "0");

                        const temp =
                            Math.round(item.temp);

                        const pop =
                            item.pop !== undefined
                                ? Math.round(item.pop * 10) * 10
                                : 0;

                        const humidity =
                            item.humidity ?? 0;

                        const wind =
                            item.wind_speed || 0;

                        const pressure =
                            item.pressure || 0;

                        return `
                            <div class="walk-hour-card">

                                <div class="walk-hour-time">
                                    ${hour}:00
                                </div>

                                <div class="walk-hour-main">
                                    <span class="walk-hour-weather-icon">
                                        ${getWeatherIcon(item)}
                                    </span>

                                    <span class="walk-hour-temp">
                                        ${temp}℃
                                    </span>
                                </div>

                                <div class="walk-hour-data">

                                    <div class="walk-hour-pop">
                                        ☂️ ${pop}%
                                    </div>

                                    <div class="walk-hour-details">

                                        <div>
                                            🌧️ ${(item.rain?.["1h"] || 0).toFixed(1)}mm
                                        </div>

                                        <div>
                                            💧 ${humidity}%
                                        </div>

                                        <div>
                                            💨 ${wind.toFixed(1)}m/s
                                        </div>

                                        <div>
                                            🌀 ${pressure}hPa
                                        </div>

                                    </div>

                                    <div class="walk-hour-toggle">
                                        <span>詳細</span>
                                        <span class="walk-hour-arrow">▼</span>
                                    </div>

                                </div>

                            </div>
                        `;
                    })
                    .join("")}

            </div>
        `;


        // --------------------------------
        // 次の柴んぽ処理　注意点
        // --------------------------------
        const nextWalkPressureCautions =
            getWalkPressureCaution(
                hourly,
                nextWalkWeather,
            );

        console.log(
            "🌀 次のお散歩の気圧注意:",
            nextWalkPressureCautions,
        );

        const nextWalkHeatCautions =
            getWalkHeatCaution(
                nextWalkWeather,
            );

        console.log(
            "🌞 次のお散歩の暑さ注意:",
            nextWalkHeatCautions,
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
                nextWalkHeatCautions,
                nextWalkRainSnowCautions,
                nextWalkHumidityCautions,
                nextWalkWindCautions,
                nextWalkPressureCautions,
            );

        console.log(
            "🐕 次のお散歩の注意点",
            nextWalkCautions,
        );

        // --------------------------------
        // 次のお散歩　おすすめコーデ
        // --------------------------------
        const nextWalkOutfit =
            getWalkOutfit(
                nextWalkWeather,
                nextWalkCautions,
            );

        const nextWalkOutfitImage =
            document.getElementById(
                "nextWalkOutfit",
            );

        if (nextWalkOutfitImage) {
            nextWalkOutfitImage.src =
                nextWalkOutfit;
        }

        const nextWalkCautionsElement =
            document.getElementById(
                "nextWalkCautions",
            );

        const nextWalkCautionsSection =
            document.getElementById(
                "nextWalkCautionsSection",
            );

        const nextWalkPriorityCautionElement =
            document.getElementById(
                "nextWalkPriorityCaution",
            );
        

    if (nextWalkPriorityCautionElement) {

        const nextWalkMaxTempElement =
            document.getElementById(
                "nextWalkMaxTemp",
            );

        if (nextWalkCautions.length > 0) {

            const priorityCaution =
                nextWalkCautions[0];

            nextWalkPriorityCautionElement.innerHTML = `
                <div class="priority-caution">

                    <div class="priority-caution-icon">
                        <img
                            src="${priorityCaution.icon}"
                            alt=""
                        >
                    </div>

                    <div class="priority-caution-text">

                        <div class="priority-caution-message">
                            ${priorityCaution.message}
                        </div>

                        <div class="priority-caution-value">
                            ${priorityCaution.value}
                        </div>

                    </div>

                </div>
            `;

        } else {

            nextWalkPriorityCautionElement.innerHTML = `
                <img
                    src="./images/cautions/msg.png"
                    class="no-priority-caution-image"
                    alt="特に注意することはありません"
                >
            `;
        }

        // 気温表示は常に非表示
        if (nextWalkMaxTempElement) {
            nextWalkMaxTempElement.style.display = "none";
        }
    }


        // --------------------------------
        // 次のお散歩　そのほかの注意
        // --------------------------------
        if (nextWalkCautionsElement) {

            const otherCautions =
                nextWalkCautions.slice(1);

            if (otherCautions.length > 0) {

                nextWalkCautionsElement.innerHTML = `
                    <div class="caution-cards">

                        ${otherCautions
                            .map((caution) => {
                                return `
                                    <div class="caution-card">

                                        <div class="caution-icon">
                                            <img
                                                src="${caution.icon}"
                                                alt=""
                                            >
                                        </div>

                                        <div class="caution-text">

                                            <div class="caution-message">
                                                ${caution.message}
                                            </div>

                                            <div class="caution-value">
                                                (${caution.value})
                                            </div>

                                        </div>

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;

                // その他の注意ポイントを表示
                if (nextWalkCautionsSection) {
                    nextWalkCautionsSection.style.display = "";
                }

            } else {

                // カードがない場合は中身もセクションも非表示
                nextWalkCautionsElement.innerHTML = "";

                if (nextWalkCautionsSection) {
                    nextWalkCautionsSection.style.display = "none";
                }
            }
        }


        // --------------------------------
        // 次の柴んぽ処理　降水確率
        // --------------------------------

        const nextWalkRainProbabilities =
            nextWalkWeather
                .filter((item) => {
                    return item.pop !== undefined;
                })
                .map((item) => {
                    return Math.round(item.pop * 10) * 10;
                });

        console.log(
            "🌧️ 次のお散歩の降水確率:",
            nextWalkRainProbabilities,
        );

        // --------------------------------
        // 次の柴んぽ処理　もちもの
        // --------------------------------

        const sun =
            getSunriseSunset(
                schedules.nextWalk.start,
                latitude,
                longitude,
            );

        console.log(
            "🌅 次のお散歩の日の出・日の入り:",
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


        const belongingIcons = {
            "☂️ 傘": "./images/belongings/umbrella_1.png",
            "☂️ 折りたたみ傘": "./images/belongings/umbrella_2.png",
            "🧻 タオル": "./images/belongings/towel.png",
            "🥾 長靴": "./images/belongings/boots.png",
            "🔥 ホッカイロ": "./images/belongings/hot.png",
            "🧤 手袋": "./images/belongings/hand.png",
            "🧣 マフラー": "./images/belongings/muffler.png",
            "🧢 防寒帽": "./images/belongings/cap.png",
            "💧 水": "./images/belongings/water.png",
            "🧊 ネッククーラー": "./images/belongings/neckcooler.png",
            "🧢 夏帽子": "./images/belongings/hat.png",
            "🔦 ライト": "./images/belongings/light.png",
        };

        const nextWalkBelongingsElement =
            document.getElementById(
                "nextWalkBelongings",
            );

        if (nextWalkBelongingsElement) {

            if (nextWalkBelongings.length > 0) {

                nextWalkBelongingsElement.innerHTML = `
                    <div class="belonging-cards">

                        ${nextWalkBelongings
                            .map((item) => {

                                const icon =
                                    belongingIcons[item];

                                return `
                                    <div class="belonging-card">

                                        <img
                                            src="${icon}"
                                            alt="${item}"
                                        >

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;

            } else {

                nextWalkBelongingsElement.innerHTML =
                    "<p>🎒 いつもの柴んぽグッズでOK！</p>";

            }
        }




        // ========================================
        // 次の次のお散歩処理
        // ========================================

        // --------------------------------
        // 次の次のお散歩 タイトル・時間帯
        // --------------------------------

        const nextNextWalkWeather =
            getWalkWeatherData(
                hourly,
                schedules.nextNextWalk,
            );

        console.log(
            "🐕 その次のお散歩データ:",
            nextNextWalkWeather,
        );



        // --------------------------------
        // 次の次のお散歩処理　コンディション
        // --------------------------------

        const nextNextWalkConditions =
            nextNextWalkWeather.map((item) => {

                const baseCondition =
                    judgeTemperatureCondition(
                        item.temp,
                        item.humidity,
                    );

                const condition =
                    adjustWeatherCondition(
                        baseCondition,
                        item,
                    );

                const conditionMessage =
                    getConditionMessage(
                        condition,
                    );

                const cautions =
                    getRainSnowCaution(item);

                return {
                    time: new Date(item.dt * 1000),
                    temp: item.temp,
                    humidity: item.humidity,
                    pressure: item.pressure,
                    rain: item.rain?.["1h"] || 0,
                    snow: item.snow?.["1h"] || 0,
                    condition,
                    conditionMessage,
                    weatherDescription:
                        item.weather?.[0]?.description || "",
                    cautions,
                };
            });

        console.log(
            "🌡️ 次の次のお散歩の気温・湿度判定:",
            nextNextWalkConditions,
        );

        const nextNextWalkCondition =
            getWorstCondition(
                nextNextWalkConditions,
            );

        console.log(
            "🐕 次の次のお散歩の総合判定:",
            nextNextWalkCondition,
        );

        const nextNextWalkConditionImage =
            document.getElementById(
                "nextNextWalkCondition",
            );

        nextNextWalkConditionImage.src =
            conditionImageMap[
                nextNextWalkCondition.condition
            ];

        nextNextWalkConditionImage.alt =
            nextNextWalkCondition.condition;

        document.getElementById(
            "nextNextWalkWeatherDescription",
        ).style.display = "none";


        // --------------------------------
        // 次の次のお散歩の代表値
        // --------------------------------

        const nextNextWalkMaxTemp =
            Math.max(
                ...nextNextWalkConditions.map(
                    (item) => item.temp,
                ),
            );

        const nextNextWalkMaxHumidity =
            Math.max(
                ...nextNextWalkConditions.map(
                    (item) => item.humidity,
                ),
            );

        const nextNextWalkMaxRain =
            Math.max(
                ...nextNextWalkConditions.map(
                    (item) => item.rain,
                ),
            );

        const nextNextWalkMaxWind =
            Math.max(
                ...nextNextWalkWeather.map(
                    (item) =>
                        item.wind_speed || 0,
                ),
            );

        console.log(
            "📊 次の次のお散歩の代表値:",
            {
                maxTemp:
                    nextNextWalkMaxTemp,
                maxHumidity:
                    nextNextWalkMaxHumidity,
                maxRain:
                    nextNextWalkMaxRain,
                maxWind:
                    nextNextWalkMaxWind,
            },
        );

        document.getElementById(
            "nextNextWalkMaxTemp",
        ).textContent =
            `${Math.round(nextNextWalkMaxTemp)}℃`;


        document.getElementById(
            "nextNextWalkHourlyWeather",
        ).innerHTML = `
            <div class="walk-hourly-cards">

                ${nextNextWalkWeather
                    .map((item) => {

                        const time =
                            new Date(item.dt * 1000);

                        const hour =
                            time
                                .getHours()
                                .toString()
                                .padStart(2, "0");

                        const temp =
                            Math.round(item.temp);

                        const pop =
                            item.pop !== undefined
                                ? Math.round(item.pop * 10) * 10
                                : 0;

                        const humidity =
                            item.humidity ?? 0;

                        const wind =
                            item.wind_speed || 0;

                        const pressure =
                            item.pressure || 0;

                        return `
                            <div class="walk-hour-card">

                                <div class="walk-hour-time">
                                    ${hour}:00
                                </div>

                                <div class="walk-hour-main">

                                    <span class="walk-hour-weather-icon">
                                        ${getWeatherIcon(item)}
                                    </span>

                                    <span class="walk-hour-temp">
                                        ${temp}℃
                                    </span>

                                </div>

                                <div class="walk-hour-data">

                                    <div class="walk-hour-pop">
                                        ☂️ ${pop}%
                                    </div>

                                    <div class="walk-hour-details">

                                        <div>
                                            🌧️ ${(item.rain?.["1h"] || 0).toFixed(1)}mm
                                        </div>

                                        <div>
                                            💧 ${humidity}%
                                        </div>

                                        <div>
                                            💨 ${wind.toFixed(1)}m/s
                                        </div>

                                        <div>
                                            🌀 ${pressure}hPa
                                        </div>

                                    </div>

                                    <div class="walk-hour-toggle">
                                        <span>詳細</span>
                                        <span class="walk-hour-arrow">▼</span>
                                    </div>

                                </div>

                            </div>
                        `;
                    })
                    .join("")}

            </div>
        `;

        // --------------------------------
        // 次のお散歩、次の次のお散歩　共通　詳細開閉処理
        // --------------------------------
        document
            .querySelectorAll(".walk-hourly-cards")
            .forEach((group) => {

                const cards =
                    group.querySelectorAll(".walk-hour-card");

                cards.forEach((card) => {

                    card.addEventListener("click", () => {

                        const isOpen =
                            card.classList.contains("open");

                        cards.forEach((targetCard) => {

                            targetCard.classList.toggle(
                                "open",
                                !isOpen
                            );

                        });

                    });

                });

            });
        console.log(
            "Cloud Functions経由で天気データ取得成功！",
        );

        console.log(
            "データ件数:",
            hourly.length,
        );

        
        // --------------------------------
        // 次の次のお散歩　注意点
        // --------------------------------

        const nextNextWalkHeatCautions =
            getWalkHeatCaution(
                nextNextWalkWeather,
            );

        const nextNextWalkRainSnowCautions =
            getWalkRainSnowCautions(
                nextNextWalkWeather,
            );

        const nextNextWalkHumidityCautions =
            getWalkHumidityCautions(
                nextNextWalkWeather,
            );

        const nextNextWalkWindCautions =
            getWalkWindCautions(
                nextNextWalkWeather,
            );

        const nextNextWalkPressureCautions =
            getWalkPressureCaution(
                hourly,
                nextNextWalkWeather,
            );

        const nextNextWalkCautions =
            getWalkCautions(
                nextNextWalkHeatCautions,
                nextNextWalkRainSnowCautions,
                nextNextWalkHumidityCautions,
                nextNextWalkWindCautions,
                nextNextWalkPressureCautions,
            );

        console.log(
            "⚠️ 次の次のお散歩の注意点:",
            nextNextWalkCautions,
        );

        // --------------------------------
        // 次の次のお散歩　おすすめコーデ
        // --------------------------------

        const nextNextWalkOutfit =
            getWalkOutfit(
                nextNextWalkWeather,
                nextNextWalkCautions,
            );

        const nextNextWalkOutfitElement =
            document.getElementById(
                "nextNextWalkOutfit",
            );

        if (nextNextWalkOutfitElement) {
            nextNextWalkOutfitElement.src =
                nextNextWalkOutfit;
        }

        // --------------------------------
        // 次の次のお散歩　最優先注意
        // --------------------------------

        const nextNextWalkPriorityCautionElement =
            document.getElementById(
                "nextNextWalkPriorityCaution",
            );

        if (nextNextWalkPriorityCautionElement) {

            const nextNextWalkMaxTempElement =
                document.getElementById(
                    "nextNextWalkMaxTemp",
                );

            if (nextNextWalkCautions.length > 0) {

                const priorityCaution =
                    nextNextWalkCautions[0];

                nextNextWalkPriorityCautionElement.innerHTML = `
                    <div class="priority-caution">

                        <div class="priority-caution-icon">
                            <img
                                src="${priorityCaution.icon}"
                                alt=""
                            >
                        </div>

                        <div class="priority-caution-text">

                            <div class="priority-caution-message">
                                ${priorityCaution.message}
                            </div>

                            <div class="priority-caution-value">
                                ${priorityCaution.value}
                            </div>

                        </div>

                    </div>
                `;

            } else {

                nextNextWalkPriorityCautionElement.innerHTML = `
                    <img
                        src="./images/cautions/msg.png"
                        class="no-priority-caution-image"
                        alt="特に注意することはありません"
                    >
                `;
            }

            // 気温表示は常に非表示
            if (nextNextWalkMaxTempElement) {
                nextNextWalkMaxTempElement.style.display = "none";
            }
        }

        // --------------------------------
        // 次の次のお散歩　そのほかの注意
        // --------------------------------

        const nextNextWalkCautionsElement =
            document.getElementById(
                "nextNextWalkCautions",
            );

        const nextNextWalkCautionsSection =
            document.getElementById(
                "nextNextWalkCautionsSection",
            );

        if (nextNextWalkCautionsElement) {

            const otherCautions =
                nextNextWalkCautions.slice(1);

            if (otherCautions.length > 0) {

                nextNextWalkCautionsElement.innerHTML = `
                    <div class="caution-cards">

                        ${otherCautions
                            .map((caution) => {
                                return `
                                    <div class="caution-card">

                                        <div class="caution-icon">
                                            <img
                                                src="${caution.icon}"
                                                alt=""
                                            >
                                        </div>

                                        <div class="caution-text">

                                            <div class="caution-message">
                                                ${caution.message}
                                            </div>

                                            <div class="caution-value">
                                                (${caution.value})
                                            </div>

                                        </div>

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;

                if (nextNextWalkCautionsSection) {
                    nextNextWalkCautionsSection.style.display = "";
                }

            } else {

                nextNextWalkCautionsElement.innerHTML = "";

                if (nextNextWalkCautionsSection) {
                    nextNextWalkCautionsSection.style.display = "none";
                }
            }
        }


        // --------------------------------
        // 次の次のお散歩の降水確率
        // --------------------------------

        const nextNextWalkRainProbabilities =
            nextNextWalkWeather
                .filter((item) => {
                    return item.pop !== undefined;
                })
                .map((item) => {
                    return Math.round(item.pop * 10) * 10;
                });

        console.log(
            "🌧️ 次の次のお散歩の降水確率:",
            nextNextWalkRainProbabilities,
        );


        // --------------------------------
        // 次の次のお散歩のもちもの
        // --------------------------------

        const nextNextWalkRainBelongings =
            getRainBelongings(
                nextNextWalkWeather,
                nextNextWalkRainProbabilities,
            );

        const nextNextWalkTemperatureBelongings =
            getTemperatureBelongings(
                nextNextWalkWeather,
            );

        const nextNextWalkColdBelongings =
            getColdBelongings(
                nextNextWalkWeather,
            );

        const nextNextWalkSnowBelongings =
            getSnowBelongings(
                nextNextWalkWeather,
            );

        const nextNextWalkBelongings = [
            ...nextNextWalkRainBelongings,
            ...nextNextWalkTemperatureBelongings,
            ...nextNextWalkColdBelongings,
            ...nextNextWalkSnowBelongings,
        ];

        const nextNextSun =
            getSunriseSunset(
                schedules.nextNextWalk.start,
                latitude,
                longitude,
            );

        const nextNextNeedsLight =
            needsWalkLight(
                schedules.nextNextWalk,
                nextNextSun.sunrise,
                nextNextSun.sunset,
            );

        if (nextNextNeedsLight) {
            nextNextWalkBelongings.push(
                "🔦 ライト",
            );
        }

        const nextNextWalkBelongingsElement =
            document.getElementById(
                "nextNextWalkBelongings",
            );

        if (nextNextWalkBelongingsElement) {

            if (nextNextWalkBelongings.length > 0) {

                nextNextWalkBelongingsElement.innerHTML = `
                    <div class="belonging-cards">

                        ${nextNextWalkBelongings
                            .map((item) => {

                                const icon =
                                    belongingIcons[item];

                                return `
                                    <div class="belonging-card">

                                        <img
                                            src="${icon}"
                                            alt="${item}"
                                        >

                                    </div>
                                `;
                            })
                            .join("")}

                    </div>
                `;

            } else {

                nextNextWalkBelongingsElement.innerHTML =
                    "<p>🎒 いつもの柴んぽグッズでOK！</p>";

            }
        }


    } catch (error) {

        console.error(
            "One Call 4.0 エラー:",
            error,
        );
    }

    // --------------------------------
    // 柴んぽ準備中画面を終了
    // --------------------------------

    const loadingScreen =
        document.getElementById("loadingScreen");

    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }

    console.timeEnd("loadPressureChange");
}


// ========================================
// タブ切り替え
// ========================================

const weatherTabs =
    document.querySelectorAll(
        ".weather-tab",
    );

const currentWeatherCard =
    document.getElementById(
        "currentWeatherCard",
    );

const nextWalkCard =
    document.getElementById(
        "nextWalkCard",
    );

const nextNextWalkCard =
    document.getElementById(
        "nextNextWalkCard",
    );

weatherTabs.forEach((tab) => {

    tab.addEventListener(
        "click",
        () => {

            const tabType =
                tab.dataset.tab;

            // すべて非表示
            currentWeatherCard.style.display =
                "none";

            nextWalkCard.style.display =
                "none";

            nextNextWalkCard.style.display =
                "none";

            // すべてのタブを通常状態
            weatherTabs.forEach((item) => {
                item.classList.remove(
                    "active",
                );
            });

            // 選択したタブを表示
            tab.classList.add("active");

            if (tabType === "current") {
                currentWeatherCard.style.display =
                    "";
            }

            if (tabType === "next") {
                nextWalkCard.style.display =
                    "";
            }

            if (tabType === "nextNext") {
                nextNextWalkCard.style.display =
                    "";
            }
        },
    );
});

currentWeatherCard.style.display =
    "";

nextWalkCard.style.display =
    "none";

nextNextWalkCard.style.display =
    "none";


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
                    false,

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

// =============================
// 設定画面の切り替え
// =============================

const settingsButton =
    document.getElementById("settingsButton");

const locationSettings =
    document.getElementById("locationSettings");

const backToMain =
    document.getElementById("backToMain");

settingsButton.addEventListener("click", () => {
    locationSettings.style.display = "block";
});

backToMain.addEventListener("click", () => {
    locationSettings.style.display = "none";
});