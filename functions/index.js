const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/scheduler");
const {onRequest, onCall, HttpsError} =
    require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
const webpush = require("web-push");

setGlobalOptions({maxInstances: 10});

// Firebase Admin初期化
admin.initializeApp();

// Secret Manager
const VAPID_PRIVATE_KEY =
    defineSecret("VAPID_PRIVATE_KEY");

const OPENWEATHER_API_KEY =
    defineSecret("OPENWEATHER_API_KEY");

// VAPID公開鍵
const VAPID_PUBLIC_KEY_PART1 =
    "BB9oI0A5rn7GCwcqOlPW1yijUWUPAyYueDsUP0ClnyxQ1xgm7m3BQts_";

const VAPID_PUBLIC_KEY_PART2 =
    "nNKYr-Y6KpSLW1WU259xajWrwpg60JE";

const VAPID_PUBLIC_KEY =
    VAPID_PUBLIC_KEY_PART1 +
    VAPID_PUBLIC_KEY_PART2;

// VAPIDの送信者情報
const VAPID_EMAIL =
    "mailto:deguchi.a.t@gmail.com";


// ========================================
// Secretを読み込めるかテスト
// ========================================

exports.testSecret = onRequest(
    {
      secrets: [VAPID_PRIVATE_KEY],
    },
    (request, response) => {
      const secret =
            VAPID_PRIVATE_KEY.value();

      if (secret) {
        logger.info(
            "VAPID_PRIVATE_KEYを正常に読み込めました！",
        );

        response.send("Secret OK!");
      } else {
        logger.error(
            "VAPID_PRIVATE_KEYが読み込めませんでした",
        );

        response.status(500).send("Secret NG");
      }
    },
);


// ========================================
// テスト通知
// ========================================

exports.sendTestNotification = onCall(
    {
      secrets: [VAPID_PRIVATE_KEY],
    },
    async (request) => {
      // ログインしているユーザーだけ許可
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "ログインが必要です",
        );
      }

      try {
        const uid =
                request.auth.uid;

        // Secret Managerから秘密鍵を取得
        const privateKey =
                VAPID_PRIVATE_KEY.value();

        // VAPID設定
        webpush.setVapidDetails(
            VAPID_EMAIL,
            VAPID_PUBLIC_KEY,
            privateKey,
        );

        // 自分のユーザー情報だけ取得
        const userDoc =
                await admin
                    .firestore()
                    .collection("users")
                    .doc(uid)
                    .get();

        if (!userDoc.exists) {
          throw new HttpsError(
              "not-found",
              "ユーザー情報が見つかりません",
          );
        }

        const userData =
                userDoc.data();

        const subscription =
                userData.pushSubscription;

        if (!subscription) {
          throw new HttpsError(
              "failed-precondition",
              "Push Subscriptionがありません",
          );
        }

        const payload =
                JSON.stringify({
                  title: "🐕 わんこの気圧予報",
                  body: "テスト通知です！🔔",
                });

        await webpush.sendNotification(
            subscription,
            payload,
        );

        logger.info(
            "テスト通知を送信しました",
            {uid: uid},
        );

        return {
          success: true,
          message: "テスト通知を送信しました！",
        };
      } catch (error) {
        logger.error(
            "テスト通知送信エラー:",
            error,
        );

        throw new HttpsError(
            "internal",
            "テスト通知の送信に失敗しました",
        );
      }
    },
);


// ========================================
// 天気データ取得
// ========================================

exports.getWeatherData = onCall(
    {
      secrets: [OPENWEATHER_API_KEY],
    },
    async (request) => {
      // ログインしているユーザーだけ許可
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "ログインが必要です",
        );
      }

      try {
        const {latitude, longitude} =
                request.data;

        // 緯度・経度チェック
        if (
          latitude === undefined ||
                longitude === undefined
        ) {
          throw new HttpsError(
              "invalid-argument",
              "緯度・経度が必要です",
          );
        }

        // Secret ManagerからAPIキー取得
        const weatherApiKey =
                OPENWEATHER_API_KEY.value();

        // 現在時刻を正時にする
        const now =
                new Date();

        now.setMinutes(
            0,
            0,
            0,
        );

        // 6時間前から取得
        const start =
                new Date(now);

        start.setHours(
            start.getHours() - 6,
        );

        const startUnix =
                Math.floor(
                    start.getTime() / 1000,
                );

        // OpenWeatherMap One Call 4.0
        const url =
                `https://api.openweathermap.org/data/4.0/onecall/timeline/1h?` +
                `lat=${latitude}` +
                `&lon=${longitude}` +
                `&appid=${weatherApiKey}` +
                `&units=metric` +
                `&lang=ja` +
                `&start=${startUnix}`;

        const response =
                await fetch(url);

        if (!response.ok) {
          throw new Error(
              `OpenWeatherMap API error: ${response.status}`,
          );
        }

        const weatherData =
                await response.json();

        const hourly = weatherData.data || [];

        try {
          const userRef =
                    admin.firestore()
                        .collection("users")
                        .doc(request.auth.uid);

          const userSnap =
                    await userRef.get();

          if (userSnap.exists) {
            const userDoc = {
              id: request.auth.uid,
              ref: userRef,
            };

            await updateNextWalkPressure(
                hourly,
                now,
                userDoc,
            );
          } else {
            logger.warn(
                "ユーザードキュメントが見つかりません",
                {
                  uid: request.auth.uid,
                },
            );
          }
        } catch (nextWalkError) {
          logger.error(
              "次のお散歩データ更新エラー",
              {
                uid: request.auth.uid,
                errorMessage: nextWalkError.message,
                errorStack: nextWalkError.stack,
              },
          );
        }

        logger.info(
            "天気データを取得しました",
            {
              uid: request.auth.uid,
              latitude: latitude,
              longitude: longitude,
              dataCount: hourly.length,
            },
        );

        return {
          success: true,
          data: hourly,
        };
      } catch (error) {
        logger.error(
            "天気データ取得エラー",
            {
              uid: request.auth.uid,
              error: error,
            },
        );

        throw new HttpsError(
            "internal",
            "天気データの取得に失敗しました",
        );
      }
    },
);


/**
 * 次のお散歩データを計算してFirestoreに保存する。
 * @param {Array} hourly 1時間ごとの天気データ
 * @param {Date} current 現在の基準時刻
 * @param {Object} userDoc ユーザードキュメント
 * @return {Object|null} 次のお散歩データ
 */
async function updateNextWalkPressure(hourly, current, userDoc) {
  const currentHour = Number(
      new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(current).find(
          (part) => part.type === "hour",
      ).value,
  );

  // 5:00〜16:59 → 夕方のお散歩
  // 17:00〜翌4:59 → 朝のお散歩
  const isEvening = currentHour >= 5 && currentHour < 17;

  logger.info("次のお散歩判定の基準時刻", {
    uid: userDoc.id,
    current: current.toISOString(),
    currentHour,
    isEvening,
  });

  // 現在時刻をJST基準の日時として取得
  const jstParts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(current);

  const parts = {};
  jstParts.forEach((part) => {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  });

  let targetStartJst;
  let targetEndJst;
  let nextWalkLabel;

  if (isEvening) {
    // 今日 11:00〜17:00 JST
    targetStartJst = {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 11,
    };
    targetEndJst = {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 17,
    };
    nextWalkLabel = "夕方のお散歩";
  } else {
    // 次の 23:00〜翌5:00 JST
    const nextDay = new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day) + 24 * 60 * 60 * 1000,
    );

    const nextDayParts = {
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
    };

    targetStartJst = {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 23,
    };

    targetEndJst = {
      year: nextDayParts.year,
      month: nextDayParts.month,
      day: nextDayParts.day,
      hour: 5,
    };

    nextWalkLabel = "朝のお散歩";
  }

  // JST → UTCへ変換
  const nextWalkStart = new Date(
      Date.UTC(
          targetStartJst.year,
          targetStartJst.month - 1,
          targetStartJst.day,
          targetStartJst.hour - 9,
      ),
  );

  const nextWalkEnd = new Date(
      Date.UTC(
          targetEndJst.year,
          targetEndJst.month - 1,
          targetEndJst.day,
          targetEndJst.hour - 9,
      ),
  );

  // 次のお散歩の開始・終了時刻のデータを探す
  const nextWalkStartData = hourly.find((item) => {
    const itemTime = new Date(item.dt * 1000);
    return Math.abs(
        itemTime.getTime() - nextWalkStart.getTime(),
    ) < 30 * 60 * 1000;
  });

  const nextWalkEndData = hourly.find((item) => {
    const itemTime = new Date(item.dt * 1000);
    return Math.abs(
        itemTime.getTime() - nextWalkEnd.getTime(),
    ) < 30 * 60 * 1000;
  });

  if (!nextWalkStartData || !nextWalkEndData) {
    logger.warn("次のお散歩データが見つかりません", {
      uid: userDoc.id,
      nextWalkStart: nextWalkStart.toISOString(),
      nextWalkEnd: nextWalkEnd.toISOString(),
    });
    return null;
  }

  // 気圧変化は「低下」のみを影響度として判定
  const nextWalkChange =
        nextWalkEndData.pressure - nextWalkStartData.pressure;

  const decrease = Math.max(0, -nextWalkChange);

  let nextJudgment;
  let walkMessage;

  if (decrease <= 2) {
    nextJudgment = "🌤️ 影響は少なめ";
    walkMessage = "いつも通りのお散歩で大丈夫そう";
  } else if (decrease <= 4) {
    nextJudgment = "🌥️ 影響する可能性あり";
    walkMessage = "お散歩は様子を見ながら";
  } else if (decrease <= 9) {
    nextJudgment = "⚠️ 影響する可能性が高め";
    walkMessage = "無理せず様子を見て";
  } else {
    nextJudgment = "🚨 影響する可能性がかなり高い";
    walkMessage = "無理せず、体調に注意";
  }

  // Firestoreへ保存
  await userDoc.ref.set(
      {
        nextWalkPressure: {
          change: nextWalkChange,
          endHour: targetEndJst.hour,
          judgment: nextJudgment,
          label: nextWalkLabel,
          startHour: targetStartJst.hour,
          walkMessage: walkMessage,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      {merge: true},
  );

  logger.info("次のお散歩データをFirestoreに保存しました", {
    uid: userDoc.id,
    label: nextWalkLabel,
    change: nextWalkChange,
    judgment: nextJudgment,
  });

  return {
    nextWalkStart,
    nextWalkEnd,
    nextWalkLabel,
    nextWalkChange,
    nextJudgment,
    nextWalkStartData,
    nextWalkEndData,
  };
}

// ========================================
// 本番通知
// ========================================

exports.sendPressureNotification = onSchedule(
    {
      schedule: "0 5,17 * * *",
      timeZone: "Asia/Tokyo",
      secrets: [
        VAPID_PRIVATE_KEY,
        OPENWEATHER_API_KEY,
      ],
    },
    async () => {
      const db =
            admin.firestore();

      // --------------------------------
      // VAPID設定
      // --------------------------------

      const privateKey =
            VAPID_PRIVATE_KEY.value();

      webpush.setVapidDetails(
          VAPID_EMAIL,
          VAPID_PUBLIC_KEY,
          privateKey,
      );

      // --------------------------------
      // OpenWeatherMap APIキー
      // --------------------------------

      const weatherApiKey =
            OPENWEATHER_API_KEY.value();

      // --------------------------------
      // ユーザー取得
      // --------------------------------

      const usersSnapshot =
            await db
                .collection("users")
                .get();

      logger.info(
          "通知対象ユーザー数",
          {
            count: usersSnapshot.size,
          },
      );

      // --------------------------------
      // ユーザーごとに処理
      // --------------------------------

      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData =
                    userDoc.data();

          // 通知OFFはスキップ
          if (
            userData.notificationEnabled !== true
          ) {
            continue;
          }

          const subscription =
                    userData.pushSubscription;

          const latitude =
                    userData.latitude;

          const longitude =
                    userData.longitude;

          if (
            !subscription ||
                    latitude === undefined ||
                    longitude === undefined
          ) {
            logger.warn(
                "通知に必要な情報がありません",
                {
                  uid: userDoc.id,
                },
            );

            continue;
          }

          // --------------------------------
          // 現在時刻
          // --------------------------------

          const now =
                    new Date();

          const japanTime =
                    new Date(now);

          japanTime.setMinutes(
              0,
              0,
              0,
          );

          // --------------------------------
          // 6時間前から取得
          // --------------------------------

          const start =
                    new Date(japanTime);

          start.setHours(
              start.getHours() - 6,
          );

          const startUnix =
                    Math.floor(
                        start.getTime() / 1000,
                    );

          logger.info(
              "基準時刻",
              {
                uid: userDoc.id,
                japanTime:
                            japanTime.toISOString(),
                start:
                            start.toISOString(),
              },
          );

          // --------------------------------
          // OpenWeatherMap One Call 4.0
          // --------------------------------

          const url =
                    `https://api.openweathermap.org/data/4.0/onecall/timeline/1h?` +
                    `lat=${latitude}` +
                    `&lon=${longitude}` +
                    `&appid=${weatherApiKey}` +
                    `&units=metric` +
                    `&lang=ja` +
                    `&start=${startUnix}`;

          const response =
                    await fetch(url);

          if (!response.ok) {
            throw new Error(
                `OpenWeatherMap API error: ${response.status}`,
            );
          }

          const weatherData =
                    await response.json();

          const hourly =
                    weatherData.data;

          logger.info(
              "デバッグ：hourlyの時刻",
              {
                uid: userDoc.id,
                hourly: hourly.map((item) => ({
                  dt: item.dt,
                  time: new Date(item.dt * 1000).toISOString(),
                })),
              },
          );

          // --------------------------------
          // 現在の基準時刻
          // --------------------------------

          const current =
                    new Date(japanTime);

          // --------------------------------
          // 現在のお散歩用
          // 6時間前 → 現在
          // --------------------------------

          const minus6 =
                    new Date(current);

          minus6.setHours(
              minus6.getHours() - 6,
          );

          // --------------------------------
          // 現在の気圧データ
          // --------------------------------

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

          if (
            !currentData ||
                    !minus6Data
          ) {
            logger.warn(
                "現在のお散歩に必要な気圧データが取得できません",
                {
                  uid: userDoc.id,
                },
            );

            continue;
          }

          // --------------------------------
          // 現在のお散歩
          // --------------------------------

          const currentWalkChange =
                    currentData.pressure -
                    minus6Data.pressure;

          const currentDecrease =
                    Math.max(0, -currentWalkChange);

          let currentJudgment;

          if (currentDecrease <= 2) {
            currentJudgment = "🌤️ 影響は少なめ";
          } else if (currentDecrease <= 4) {
            currentJudgment = "🌥️ 影響する可能性あり";
          } else if (currentDecrease <= 9) {
            currentJudgment = "⚠️ 影響する可能性が高め";
          } else {
            currentJudgment = "🚨 影響する可能性がかなり高い";
          }


          // --------------------------------
          // 次のお散歩データを計算・Firestore保存
          // --------------------------------
          const nextWalkResult =
                    await updateNextWalkPressure(hourly, current, userDoc);

          if (!nextWalkResult) continue;

          const {
            nextWalkStart,
            nextWalkEnd,
            nextWalkLabel,
            nextWalkChange,
            nextJudgment,
            nextWalkEndData,
          } = nextWalkResult;


          // --------------------------------
          // 今後3時間の降水確率
          // --------------------------------

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

            logger.info(
                "降水確率の対象時刻",
                {
                  uid: userDoc.id,
                  hour: i,
                  target:
                                target.toISOString(),
                  targetHour:
                                target.getHours(),
                },
            );

            const item =
                        hourly.find((weather) =>
                          weather.dt === targetUnix,
                        );

            if (
              item &&
                        item.pop !== undefined
            ) {
              rainProbabilities.push(
                  Math.round(
                      item.pop * 100,
                  ),
              );
            }
          }

          const maxRainProbability =
                    rainProbabilities.length > 0 ?
                        Math.max(
                            ...rainProbabilities,
                        ) :
                        null;

          logger.info(
              "今後3時間の降水確率",
              {
                uid: userDoc.id,
                probabilities:
                            rainProbabilities,
              },
          );

          // --------------------------------
          // 次のお散歩時間帯の
          // 降水確率
          // --------------------------------

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

          const nextWalkMaxRainProbability =
                    nextWalkRainProbabilities.length > 0 ?
                        Math.max(
                            ...nextWalkRainProbabilities,
                        ) :
                        null;

          logger.info(
              "次のお散歩の降水確率",
              {
                uid: userDoc.id,
                label: nextWalkLabel,
                probabilities:
                            nextWalkRainProbabilities,
                max:
                            nextWalkMaxRainProbability,
              },
          );


          // --------------------------------
          // 通知本文
          // --------------------------------

          const currentChangeText =
                    (currentWalkChange > 0 ? "+" : "") +
                    currentWalkChange +
                    " hPa";

          const nextChangeText =
                    (nextWalkChange > 0 ? "+" : "") +
                    nextWalkChange +
                    " hPa";

          const currentRainText =
                    maxRainProbability !== null ?
                        `${maxRainProbability}%` :
                        "---";

          const nextRainText =
                    nextWalkMaxRainProbability !== null ?
                        `${nextWalkMaxRainProbability}%` :
                        "---";

          const payload =
                    JSON.stringify({
                      title:
                            "わんこの気圧予報",

                      body:
                            `🐕 今のお散歩\n` +
                            `注意度：${currentJudgment} ` +
                            `（気圧変化 ${currentChangeText}）\n` +
                            `🌀 ${currentData.pressure} hPa ` +
                            `🌡️ ${currentData.temp}℃ ` +
                            `💧 ${currentData.humidity}% ` +
                            `☔ ${currentRainText}\n\n` +

                            `🌅 ${nextWalkLabel}\n` +
                            `影響度：${nextJudgment} ` +
                            `（気圧変化 ${nextChangeText}）\n` +
                            `🌀 ${nextWalkEndData.pressure} hPa ` +
                            `🌡️ ${nextWalkEndData.temp}℃ ` +
                            `💧 ${nextWalkEndData.humidity}% ` +
                            `☔ ${nextRainText}`,
                    });

          // --------------------------------
          // 通知送信
          // --------------------------------

          try {
            await webpush.sendNotification(
                subscription,
                payload,
            );

            logger.info(
                "本番通知を送信しました",
                {
                  uid: userDoc.id,
                },
            );
          } catch (pushError) {
            logger.error(
                "通知送信エラー",
                {
                  uid: userDoc.id,
                  error: pushError,
                },
            );
          }
        } catch (userError) {
          // 1ユーザーのエラーで
          // 他のユーザーの処理を止めない
          logger.error(
              "ユーザー別通知処理エラー",
              {
                uid: userDoc.id,
                errorMessage: userError.message,
                errorStack: userError.stack,
              },
          );
        }
      }

      logger.info(
          "本番通知処理が完了しました",
      );
    },
);
