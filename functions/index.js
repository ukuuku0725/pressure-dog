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

        // ※※development⇔production切り替え　本番ではここをコメントアウトする※※
        if (userData.environment !== "development") {
            throw new HttpsError(
                "permission-denied",
                "開発環境のユーザーのみ実行できます",
            );
        }

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
                  title: "柴んぽ",
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

        const hourly =
            weatherData.data || [];


        console.log(
            "🌅 OpenWeatherのレスポンス:",
            weatherData,
        );

        // 2回目のデータを取得
        let nextHourly = [];

        if (weatherData.next) {
          const nextResponse =
                await fetch(weatherData.next);

          if (!nextResponse.ok) {
            throw new Error(
                `OpenWeatherMap next API error: ${nextResponse.status}`,
            );
          }

          const nextWeatherData =
                await nextResponse.json();

          nextHourly =
                nextWeatherData.data || [];

          logger.info(
              "2回目の天気データを取得しました",
              {
                uid: request.auth.uid,
                dataCount: nextHourly.length,
              },
          );
        }

        // 1回目＋2回目を結合
        const combinedHourly =
            [...hourly, ...nextHourly];

        logger.info(
            "天気データを結合しました",
            {
              uid: request.auth.uid,
              firstCount: hourly.length,
              secondCount: nextHourly.length,
              totalCount: combinedHourly.length,
              firstTime: hourly.length > 0 ?
                new Date(hourly[0].dt * 1000).toISOString() :
                null,
              lastTime: combinedHourly.length > 0 ?
                new Date(
                    combinedHourly[combinedHourly.length - 1].dt * 1000,
                ).toISOString() :
                null,
            },
        );

        return {
          success: true,
          data: combinedHourly,
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


// ========================================
// 定期天気データ取得
// ========================================

exports.refreshWeatherCache = onSchedule(
    {
      schedule: "0 4-21 * * *",
      timeZone: "Asia/Tokyo",
      secrets: [OPENWEATHER_API_KEY],
    },
    async () => {
      const db = admin.firestore();

      // ※※developmentユーザーだけ取得
      // ※※development⇔production切り替え※※
      const usersSnapshot =
            await db
                .collection("users")
                .where("environment", "==", "development")
                .get();

      logger.info(
          "定期天気取得の対象ユーザー数",
          {
            count: usersSnapshot.size,
          },
      );

      const weatherApiKey =
            OPENWEATHER_API_KEY.value();

      // ユーザーごとに処理
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData =
                    userDoc.data();

          const latitude =
                    userData.latitude;

          const longitude =
                    userData.longitude;

          // 地域情報がなければスキップ
          if (
            latitude === undefined ||
                    longitude === undefined
          ) {
            logger.warn(
                "天気取得に必要な地域情報がありません",
                {
                  uid: userDoc.id,
                },
            );

            continue;
          }

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

          const hourly =
                    weatherData.data || [];

          // 2回目のデータを取得
          let nextHourly = [];

          if (weatherData.next) {
            const nextResponse =
                    await fetch(weatherData.next);

            if (!nextResponse.ok) {
              throw new Error(
                  `OpenWeatherMap next API error: ${nextResponse.status}`,
              );
            }

            const nextWeatherData =
                    await nextResponse.json();

            nextHourly =
                    nextWeatherData.data || [];
          }

          // 1回目＋2回目を結合
          const combinedHourly =
                    [...hourly, ...nextHourly];

          // Firestoreへ保存
          await userDoc.ref.set(
              {
                weatherCache: {
                  data: combinedHourly,
                  updatedAt:
                            admin.firestore.FieldValue.serverTimestamp(),
                },
              },
              {
                merge: true,
              },
          );

          logger.info(
              "定期天気データを保存しました",
              {
                uid: userDoc.id,
                latitude,
                longitude,
                dataCount: combinedHourly.length,
              },
          );
        } catch (error) {
          logger.error(
              "定期天気データ取得エラー",
              {
                uid: userDoc.id,
                errorMessage: error.message,
                errorStack: error.stack,
              },
          );
        }
      }

      logger.info(
          "定期天気データ取得処理が完了しました",
      );
    },
);