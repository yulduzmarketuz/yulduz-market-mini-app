// =====================================================
// TELEGRAM ADMIN AUTH
// =====================================================

async function verifyTelegramAdmin(request, env) {

  try {

    const initData =
      request.headers.get("X-Telegram-Init-Data");

    if (!initData) {
      return false;
    }

    const params =
      new URLSearchParams(initData);

    const hash =
      params.get("hash");

    if (!hash) {
      return false;
    }

    params.delete("hash");

    const dataCheckString =
      [...params.entries()]
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(
          ([key, value]) =>
            `${key}=${value}`
        )
        .join("\n");

    const encoder =
      new TextEncoder();

    const secretKey =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode("WebAppData"),
        {
          name: "HMAC",
          hash: "SHA-256"
        },
        false,
        ["sign"]
      );

    const secret =
      await crypto.subtle.sign(
        "HMAC",
        secretKey,
        encoder.encode(env.BOT_TOKEN)
      );

    const secretBytes =
      new Uint8Array(secret);

    const dataKey =
      await crypto.subtle.importKey(
        "raw",
        secretBytes,
        {
          name: "HMAC",
          hash: "SHA-256"
        },
        false,
        ["sign"]
      );

    const signature =
      await crypto.subtle.sign(
        "HMAC",
        dataKey,
        encoder.encode(dataCheckString)
      );

    const calculatedHash =
      [...new Uint8Array(signature)]
        .map(
          byte =>
            byte
              .toString(16)
              .padStart(2, "0")
        )
        .join("");

    if (calculatedHash !== hash) {
      return false;
    }

    const user =
      JSON.parse(
        params.get("user") || "{}"
      );

    return (
      String(user.id) ===
      String(env.ADMIN_CHAT_ID)
    );

  } catch (error) {

    console.error(
      "❌ TELEGRAM ADMIN AUTH ERROR:",
      error
    );

    return false;
  }
}
const MINI_APP_URL =
  "https://yulduz-market-mini-app.pardayevx055.workers.dev";

const YESPOS_BASE_URL =
  "https://marketplace.yestask.uz/api/v1";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}

async function yesposFetch(path, env, options = {}) {
  const headers = {
    "API-Key": env.YESPOS_API_KEY,
    "Content-Type": "application/json",
    ...options.headers
  };

  return fetch(
    `${YESPOS_BASE_URL}${path}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(options.body || {})
    }
  );
}


// =====================================================
// TELEGRAM ADMIN
// =====================================================

async function sendAdminTelegram(env, text, orderNumber) {

  console.log("🚀 TELEGRAM ADMIN FUNKSIYASI ISHLADI");

  if (!env.BOT_TOKEN) {
    console.error("❌ BOT_TOKEN YO'Q");
    return false;
  }

  if (!env.ADMIN_CHAT_ID) {
    console.error("❌ ADMIN_CHAT_ID YO'Q");
    return false;
  }

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.ADMIN_CHAT_ID,

          text,

          reply_markup: {
  inline_keyboard: [
    [
      {
        text: "✅ Qabul qilish",
        callback_data:
          `order_accept:${orderNumber}`
      }
    ],
    [
      {
        text: "❌ Bekor qilish",
        callback_data:
          `order_cancelled:${orderNumber}`
      }
    ]
  ]
}
        })
      }
    );

    const result = await response.text();

    console.log(
      "📨 TELEGRAM ADMIN JAVOBI:",
      result
    );

    if (!response.ok) {
      console.error(
        "❌ TELEGRAM API XATOSI:",
        result
      );

      return false;
    }

    console.log(
      "✅ TELEGRAM ADMIN XABARI YUBORILDI"
    );

    return true;

  } catch (error) {

    console.error(
      "❌ TELEGRAM FETCH XATOSI:",
      error
    );

    return false;
  }
}


// =====================================================
// ADMIN BUYURTMA MATNI
// =====================================================

function buildAdminOrderMessage(data, orderNumber) {

  const customerName =
    `${data.first_name || ""} ${data.last_name || ""}`
      .trim() ||
    "Noma'lum mijoz";

  const username =
    data.username
      ? `@${String(data.username).replace(/^@/, "")}`
      : "Username yo‘q";

  const phone =
    data.phone ||
    "Telefon yo‘q";

  const address =
    data.address_name ||
    "Lokatsiya";

  const payment =
    data.payment_method === "cash"
      ? "Naqd"
      : data.payment_method || "Noma'lum";

  let itemsText = "";

  for (
    let index = 0;
    index < data.items.length;
    index++
  ) {

    const item = data.items[index];

    const name =
      item?.name ||
      item?.title ||
      "Mahsulot";

    const quantity =
      Number(item?.quantity || 0);

    const price =
      Number(item?.price || 0);

    const itemTotal =
      price * quantity;

    itemsText +=
      `${index + 1}. ${name}\n` +
      `   ${quantity} dona × ${price.toLocaleString("uz-UZ")} so‘m = ${itemTotal.toLocaleString("uz-UZ")} so‘m\n`;
  }

  const total =
    Number(data.total || 0);

  return `🛒 YANGI BUYURTMA

🔢 Buyurtma: #${orderNumber}

👤 Mijoz:
${customerName}

📱 ${username}
☎️ ${phone}

🛍 MAHSULOTLAR:
${itemsText}
💰 Jami: ${total.toLocaleString("uz-UZ")} so‘m

💳 To‘lov: ${payment}

📍 Manzil: ${address}

${data.address_extra ? `📝 Qo‘shimcha: ${data.address_extra}\n` : ""}${data.note ? `💬 Izoh: ${data.note}\n` : ""}
🟡 Holat: Yangi`;
}


export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


    // =====================================================
    // TELEGRAM WEBHOOK
    // =====================================================

    if (
      url.pathname === "/telegram-webhook" &&
      request.method === "POST"
    ) {

      try {

        const update =
  await request.json();

const message =
  update.message;

// =================================================
// ADMIN ORDER BUTTONS
// =================================================

if (update.callback_query) {

  const callback =
    update.callback_query;

  const callbackData =
    callback.data || "";

  const callbackChatId =
    callback.message?.chat?.id;

  console.log(
    "🔘 ADMIN TUGMA BOSILDI:",
    callbackData
  );


  // =================================================
  // ADMIN TEKSHIRUVI
  // =================================================

  if (
    String(callbackChatId) !==
    String(env.ADMIN_CHAT_ID)
  ) {

    console.error(
      "❌ RUXSATSIZ ADMIN TUGMA BOSILISHI"
    );

    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          callback_query_id:
            callback.id,

          text:
            "❌ Ruxsat yo‘q",

          show_alert:
            true
        })
      }
    );

    return new Response("OK");
  }


  // =================================================
  // CALLBACK MA'LUMOTINI AJRATISH
  // =================================================

  const parts =
    callbackData.split(":");

  const action =
    parts[0] || "";

  const orderNumber =
    parts.slice(1).join(":");


  if (
    !action ||
    !orderNumber
  ) {

    console.error(
      "❌ CALLBACK DATA NOTO‘G‘RI:",
      callbackData
    );

    return new Response("OK");
  }


  // =================================================
  // STATUS
  // =================================================

  const statusMap = {

    order_accept:
      "qabul_qilindi",

    order_preparing:
      "yigilmoqda",

    order_ready:
      "yetkazib_berishga_tayyor",

    order_delivering:
      "yolda",

    order_delivered:
      "yetkazildi",

    order_cancelled:
      "bekor_qilingan"

  };


  const newStatus =
    statusMap[action];


  if (!newStatus) {

    console.error(
      "❌ NOMA'LUM BUYURTMA AKSIYASI:",
      action
    );

    return new Response("OK");
  }


  // =================================================
  // D1 STATUSNI YANGILASH
  // =================================================

  try {

    const result =
      await env.DB.prepare(`
        UPDATE orders
        SET status = ?
        WHERE order_number = ?
      `)
        .bind(
          newStatus,
          orderNumber
        )
        .run();


    console.log(
      "✅ BUYURTMA STATUSI YANGILANDI:",
      orderNumber,
      newStatus,
      result.meta?.changes
    );


    // =================================================
    // TELEGRAM CALLBACK JAVOBI
    // =================================================

    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          callback_query_id:
            callback.id,

          text:
            `✅ Holat: ${newStatus}`
        })
      }
    );


    // =================================================
    // ADMIN XABARINI YANGILASH
    // =================================================

    const statusTextMap = {

      qabul_qilindi:
        "🟢 Qabul qilindi",

      yigilmoqda:
        "📦 Yig‘ilmoqda",

      yetkazib_berishga_tayyor:
        "🚚 Yetkazishga tayyor",

      yolda:
        "🛵 Yo‘lda",

      yetkazildi:
        "✅ Yetkazildi",

      bekor_qilingan:
        "❌ Bekor qilingan"

    };


    const statusText =
      statusTextMap[newStatus] ||
      newStatus;


    const oldText =
      callback.message?.text ||
      "";


    const updatedText =
      oldText.replace(
        /🟡 Holat:.*$/s,
        `${statusText}`
      );


    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({

          chat_id:
            callbackChatId,

          message_id:
            callback.message?.message_id,

          text:
            updatedText,

          reply_markup: {
  inline_keyboard:
    newStatus === "qabul_qilindi"
      ? [
          [
            {
              text: "📦 Yig‘ilmoqda",
              callback_data:
                `order_preparing:${orderNumber}`
            }
          ],
          [
            {
              text: "❌ Bekor qilish",
              callback_data:
                `order_cancelled:${orderNumber}`
            }
          ]
        ]

      : newStatus === "yigilmoqda"
      ? [
          [
            {
              text: "🚚 Yetkazishga tayyor",
              callback_data:
                `order_ready:${orderNumber}`
            }
          ],
          [
            {
              text: "❌ Bekor qilish",
              callback_data:
                `order_cancelled:${orderNumber}`
            }
          ]
        ]

      : newStatus === "yetkazib_berishga_tayyor"
      ? [
          [
            {
              text: "🛵 Yo‘lda",
              callback_data:
                `order_delivering:${orderNumber}`
            }
          ],
          [
            {
              text: "❌ Bekor qilish",
              callback_data:
                `order_cancelled:${orderNumber}`
            }
          ]
        ]

      : newStatus === "yolda"
      ? [
          [
            {
              text: "✅ Yetkazildi",
              callback_data:
                `order_delivered:${orderNumber}`
            }
          ]
        ]

      : []
}

        })
      }
    );


  } catch (error) {

    console.error(
      "❌ STATUS YANGILASHDA XATO:",
      error
    );

    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          callback_query_id:
            callback.id,

          text:
            "❌ Statusni yangilashda xatolik",

          show_alert:
            true
        })
      }
    );
  }


  return new Response("OK");
}

if (message) {

  const chatId =
    message.chat?.id;

  const user =
    message.from;

  // qolgan eski kodingiz...


          // =================================================
          // CONTACT
          // =================================================

          if (message.contact) {

            const contact =
              message.contact;

            const telegramId =
              contact.user_id?.toString() ||
              user?.id?.toString();

            const phone =
              contact.phone_number || "";

            if (
              telegramId &&
              phone
            ) {

              await env.DB.prepare(`
                INSERT INTO customers (
                  telegram_id,
                  first_name,
                  last_name,
                  username,
                  phone
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(telegram_id)
                DO UPDATE SET
                  first_name = excluded.first_name,
                  last_name = excluded.last_name,
                  username = excluded.username,
                  phone = excluded.phone,
                  updated_at = CURRENT_TIMESTAMP
              `)
                .bind(
                  telegramId,
                  user?.first_name || "",
                  user?.last_name || "",
                  user?.username
                    ? `@${user.username}`
                    : "",
                  phone
                )
                .run();

              console.log(
                "✅ TELEFON D1 GA SAQLANDI:",
                telegramId,
                phone
              );

              await fetch(
                `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json"
                  },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text:
                      "✅ Telefon raqamingiz saqlandi."
                  })
                }
              );
            }

            return new Response("OK");
          }


          // =================================================
          // /start
          // =================================================

          if (
            message.text === "/start"
          ) {

            const username =
              user?.username
                ? `@${user.username}`
                : user?.first_name ||
                  "mijoz";

            const text =
`⭐ YULDUZ MARKET

Salom, ${username}! 👋

Xaridlaringizni uydan chiqmasdan amalga oshiring.

Buyurtmangizni tayyorlab, manzilingizga yetkazamiz. 🚚`;

            await fetch(
              `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text,
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text:
                            "🛒 XARIDLARNI BOSHLASH",
                          web_app: {
                            url:
                              MINI_APP_URL
                          }
                        }
                      ]
                    ]
                  }
                })
              }
            );
          }
        }

        return new Response("OK");

      } catch (error) {

        console.error(
          "Telegram webhook error:",
          error
        );

        return new Response(
          "Webhook error",
          {
            status: 500
          }
        );
      }
    }


    // =====================================================
    // CUSTOMER POST
    // =====================================================

    if (
      url.pathname === "/customer" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();

        const telegramId =
          data.telegram_id?.toString();

        if (!telegramId) {
          return json(
            {
              error:
                "telegram_id kerak"
            },
            400
          );
        }

        await env.DB.prepare(`
          INSERT INTO customers (
            telegram_id,
            first_name,
            last_name,
            username,
            phone
          )
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(telegram_id)
          DO UPDATE SET
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            username = excluded.username,
            phone = excluded.phone,
            updated_at = CURRENT_TIMESTAMP
        `)
          .bind(
            telegramId,
            data.first_name || "",
            data.last_name || "",
            data.username || "",
            data.phone || ""
          )
          .run();

        return json({
          success: true
        });

      } catch (error) {

        console.error(
          "D1 customer error:",
          error
        );

        return json(
          {
            error:
              "Mijozni saqlashda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }


    // =====================================================
    // CUSTOMER GET
    // =====================================================

    if (
      url.pathname === "/customer" &&
      request.method === "GET"
    ) {

      try {

        const telegramId =
          url.searchParams.get(
            "telegram_id"
          );

        if (!telegramId) {
          return json(
            {
              error:
                "telegram_id kerak"
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              telegram_id,
              first_name,
              last_name,
              username,
              phone,
              created_at,
              updated_at
            FROM customers
            WHERE telegram_id = ?
          `)
            .bind(telegramId)
            .first();

        return json({
          success: true,
          customer:
            result || null
        });

      } catch (error) {

        console.error(
          "D1 customer GET error:",
          error
        );

        return json(
          {
            error:
              "Mijozni olishda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }


    // =====================================================
    // ADDRESSES GET
    // =====================================================

    if (
      url.pathname === "/addresses" &&
      request.method === "GET"
    ) {

      try {

        const telegramId =
          url.searchParams.get(
            "telegram_id"
          );

        if (!telegramId) {
          return json(
            {
              error:
                "telegram_id kerak"
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              telegram_id,
              name,
              icon,
              latitude,
              longitude,
              created_at,
              updated_at
            FROM addresses
            WHERE telegram_id = ?
            ORDER BY id DESC
          `)
            .bind(telegramId)
            .all();

        return json({
          success: true,
          addresses:
            result.results || []
        });

      } catch (error) {

        console.error(
          "D1 addresses GET error:",
          error
        );

        return json(
          {
            error:
              "Manzillarni olishda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }


    // =====================================================
    // ADDRESSES POST
    // =====================================================

    if (
      url.pathname === "/addresses" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();

        const telegramId =
          data.telegram_id?.toString();

        if (!telegramId) {
          return json(
            {
              error:
                "telegram_id kerak"
            },
            400
          );
        }

        if (
          !data.name ||
          data.latitude === undefined ||
          data.longitude === undefined
        ) {
          return json(
            {
              error:
                "name, latitude va longitude kerak"
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            INSERT INTO addresses (
              telegram_id,
              name,
              icon,
              latitude,
              longitude
            )
            VALUES (?, ?, ?, ?, ?)
          `)
            .bind(
              telegramId,
              data.name.trim(),
              data.icon || "📍",
              Number(data.latitude),
              Number(data.longitude)
            )
            .run();

        return json({
          success: true,
          id:
            result.meta?.last_row_id ||
            null
        });

      } catch (error) {

        console.error(
          "D1 addresses POST error:",
          error
        );

        return json(
          {
            error:
              "Manzilni saqlashda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }


    // =====================================================
    // ADDRESSES DELETE
    // =====================================================

    if (
      url.pathname === "/addresses" &&
      request.method === "DELETE"
    ) {

      try {

        const data =
          await request.json();

        const telegramId =
          data.telegram_id?.toString();

        const addressId =
          Number(data.id);

        if (!telegramId) {
          return json(
            {
              error:
                "telegram_id kerak"
            },
            400
          );
        }

        if (!addressId) {
          return json(
            {
              error:
                "address id kerak"
            },
            400
          );
        }

        const result =
          await env.DB.prepare(`
            DELETE FROM addresses
            WHERE id = ?
            AND telegram_id = ?
          `)
            .bind(
              addressId,
              telegramId
            )
            .run();

        return json({
          success: true,
          deleted:
            (result.meta?.changes || 0) > 0
        });

      } catch (error) {

        console.error(
          "D1 addresses DELETE error:",
          error
        );

        return json(
          {
            error:
              "Manzilni o‘chirishda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }


    // =====================================================
// CREATE ORDER
// =====================================================

if (
  url.pathname === "/orders" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const telegramId =
      data.telegram_id?.toString();

    if (!telegramId) {
      return json(
        {
          error:
            "telegram_id kerak"
        },
        400
      );
    }

    if (
      !Array.isArray(data.items) ||
      data.items.length === 0
    ) {
      return json(
        {
          error:
            "Buyurtmada mahsulotlar bo‘lishi kerak"
        },
        400
      );
    }

    const total =
      Number(data.total || 0);

    if (total <= 0) {
      return json(
        {
          error:
            "Buyurtma summasi noto‘g‘ri"
        },
        400
      );
    }


    // =================================================
    // ORDER NUMBER
    // =================================================

    const orderNumber =
      `YLZ-${Date.now()}`;


    // =================================================
    // ADMIN XABARINI TAYYORLASH
    // =================================================

    const adminMessage =
      buildAdminOrderMessage(
        data,
        orderNumber
      );


    // =================================================
    // TELEGRAM ADMIN
    // =================================================

    console.log(
      "🚀 ADMIN TELEGRAMGA YUBORISH BOSHLANDI:",
      orderNumber
    );

    await sendAdminTelegram(
  env,
  adminMessage,
  orderNumber
);


    // =================================================
    // BUYURTMA D1 GA SAQLANADI
    // =================================================

    const result =
      await env.DB.prepare(`
        INSERT INTO orders (
          order_number,
          telegram_id,
          first_name,
          last_name,
          username,
          phone,
          items,
          total,
          address_name,
          latitude,
          longitude,
          address_extra,
          note,
          payment_method,
          payment_status,
          status,
          yespos_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          orderNumber,
          telegramId,

          data.first_name || "",
          data.last_name || "",
          data.username || "",
          data.phone || "",

          JSON.stringify(
            data.items
          ),

          total,

          data.address_name || "",

          data.latitude !== undefined
            ? Number(data.latitude)
            : null,

          data.longitude !== undefined
            ? Number(data.longitude)
            : null,

          data.address_extra || "",
          data.note || "",

          data.payment_method ||
            "cash",

          data.payment_status ||
            "pending",

          "yangi",

          "pending"
        )
        .run();


    console.log(
      "✅ BUYURTMA D1 GA SAQLANDI:",
      orderNumber,
      telegramId
    );


    // =================================================
    // MINI APP GA JAVOB
    // =================================================

    return json({
      success: true,

      order: {
        id:
          result.meta?.last_row_id ||
          null,

        order_number:
          orderNumber,

        status:
          "yangi"
      }
    });

  } catch (error) {

    console.error(
      "❌ D1 ORDER ERROR:",
      error
    );

    return json(
      {
        error:
          "Buyurtmani saqlashda xatolik",

        message:
          error.message
      },
      500
    );
  }
}

    // =====================================================
// GET ORDERS
// =====================================================

if (
  url.pathname === "/orders" &&
  request.method === "GET"
) {

  try {

    const telegramId =
      url.searchParams.get("telegram_id");

    if (!telegramId) {
      return json(
        {
          error:
            "telegram_id kerak"
        },
        400
      );
    }


    const result =
      await env.DB.prepare(`
        SELECT
          id,
          order_number,
          telegram_id,
          first_name,
          last_name,
          username,
          phone,
          items,
          total,
          address_name,
          latitude,
          longitude,
          address_extra,
          note,
          payment_method,
          payment_status,
          status,
          yespos_status,
          created_at
        FROM orders
        WHERE telegram_id = ?
        ORDER BY id DESC
      `)
        .bind(telegramId)
        .all();


    const orders =
      (result.results || []).map(order => {

        let items = [];

        try {
          items =
            JSON.parse(
              order.items || "[]"
            );
        } catch (error) {
          items = [];
        }

        return {
          ...order,
          items
        };

      });


    return json({
      success: true,
      orders
    });

  } catch (error) {

    console.error(
      "❌ D1 ORDERS GET ERROR:",
      error
    );

    return json(
      {
        error:
          "Buyurtmalarni olishda xatolik",

        message:
          error.message
      },
      500
    );
  }
}
    // =====================================================
// TELEGRAM ADMIN CHECK
// =====================================================

if (
  url.pathname === "/admin-check" &&
  request.method === "GET"
) {

  const isAdmin =
    await verifyTelegramAdmin(
      request,
      env
    );

  return json({
    success: true,
    admin: isAdmin
  });

}
    // =====================================================
// PRODUCT IMAGE UPLOAD
// =====================================================

if (
  url.pathname === "/upload-product-image" &&
  request.method === "POST"
) {

  try {

    const isAdmin =
      await verifyTelegramAdmin(
        request,
        env
      );

    if (!isAdmin) {
      return json(
        {
          error: "Ruxsat yo‘q"
        },
        403
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!file) {
      return json(
        {
          error: "Rasm topilmadi"
        },
        400
      );
    }

    if (!(file instanceof File)) {
      return json(
        {
          error: "Noto‘g‘ri fayl"
        },
        400
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      return json(
        {
          error:
            "Faqat JPG, PNG yoki WEBP rasm yuklash mumkin."
        },
        400
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return json(
        {
          error:
            "Rasm hajmi 5 MB dan oshmasligi kerak."
        },
        400
      );
    }


    // =================================================
    // TELEGRAMGA RASM YUBORISH
    // =================================================

    const telegramForm =
      new FormData();

    telegramForm.append(
      "chat_id",
      String(env.ADMIN_CHAT_ID)
    );

    telegramForm.append(
      "document",
      file,
      file.name || "product-image"
    );


    const telegramResponse =
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`,
        {
          method: "POST",
          body: telegramForm
        }
      );


    const telegramData =
      await telegramResponse.json();


    if (
      !telegramResponse.ok ||
      !telegramData.ok
    ) {

      console.error(
        "❌ TELEGRAM RASM XATOSI:",
        telegramData
      );

      return json(
        {
          error:
            "Rasmni Telegramga saqlashda xatolik."
        },
        500
      );
    }


    const document =
      telegramData.result?.document;


    const fileId =
      document?.file_id;


    if (!fileId) {

      console.error(
        "❌ TELEGRAM FILE_ID TOPILMADI"
      );

      return json(
        {
          error:
            "Telegram file_id qaytarmadi."
        },
        500
      );
    }


    console.log(
      "✅ MAHSULOT RASMI TELEGRAMGA SAQLANDI:",
      fileId
    );


    return json({
      success: true,

      file_id:
        fileId,

      image:
        `/product-images/${encodeURIComponent(fileId)}`
    });


  } catch (error) {

    console.error(
      "❌ PRODUCT IMAGE UPLOAD ERROR:",
      error
    );

    return json(
      {
        error:
          "Rasm yuklashda xatolik.",
        message:
          error.message
      },
      500
    );
  }
}
        // =====================================================
    // PRODUCTS GET
    // =====================================================

    if (
      url.pathname === "/products" &&
      request.method === "GET"
    ) {

      try {

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              name,
              category,
              price,
              unit,
              image,
              icon,
              visible,
              related
            FROM products
            WHERE visible = 1
            ORDER BY id ASC
          `)
            .all();


        const products =
          (result.results || []).map(product => {

            let related = [];

            try {
              related =
                JSON.parse(
                  product.related || "[]"
                );
            } catch (error) {
              related = [];
            }

            return {
              ...product,
              related
            };

          });


        return json({
          success: true,
          products
        });

      } catch (error) {

        console.error(
          "❌ D1 PRODUCTS GET ERROR:",
          error
        );

        return json(
          {
            error:
              "Mahsulotlarni olishda xatolik",
            message:
              error.message
          },
          500
        );
      }
    }

// =====================================================
// PRODUCTS CREATE
// =====================================================

if (
  url.pathname === "/products" &&
  request.method === "POST"
) {

  try {

    const isAdmin =
      await verifyTelegramAdmin(
        request,
        env
      );

    if (!isAdmin) {
      return json(
        {
          error:
            "Ruxsat yo‘q"
        },
        403
      );
    }

    const body =
      await request.json();

    const {
      name,
      category,
      price,
      unit,
      image,
      icon,
      visible,
      related
    } = body;


    if (
      !name ||
      !category ||
      price === undefined
    ) {
      return json(
        {
          error:
            "name, category va price kerak"
        },
        400
      );
    }


    const id =
      Date.now();


    await env.DB
      .prepare(`
        INSERT INTO products
        (
          id,
          name,
          category,
          price,
          unit,
          image,
          icon,
          visible,
          related
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        name,
        category,
        Number(price),
        unit || "dona",
        image || null,
        icon || "📦",
        visible === false ? 0 : 1,
        JSON.stringify(
          Array.isArray(related)
            ? related
            : []
        )
      )
      .run();


    return json({
      success: true,
      product: {
        id,
        name,
        category,
        price: Number(price),
        unit: unit || "dona",
        image: image || null,
        icon: icon || "📦",
        visible:
          visible === false
            ? 0
            : 1,
        related:
          Array.isArray(related)
            ? related
            : []
      }
    });


  } catch (error) {

    console.error(
      "❌ D1 PRODUCTS CREATE ERROR:",
      error
    );

    return json(
      {
        error:
          "Mahsulot qo‘shishda xatolik",
        message:
          error.message
      },
      500
    );
  }
}
    // =====================================================
// PRODUCTS UPDATE
// =====================================================

if (
  url.pathname.startsWith("/products/") &&
  request.method === "PUT"
) {

  try {

    const isAdmin =
      await verifyTelegramAdmin(
        request,
        env
      );

    if (!isAdmin) {
      return json(
        {
          error:
            "Ruxsat yo‘q"
        },
        403
      );
    }

    const id =
      Number(
        url.pathname.split("/").pop()
      );

    if (!id) {
      return json(
        {
          error: "Mahsulot ID kerak"
        },
        400
      );
    }

    const body =
      await request.json();

    const {
      name,
      category,
      price,
      unit,
      image,
      icon,
      visible,
      related
    } = body;

    await env.DB
      .prepare(`
        UPDATE products
        SET
          name = ?,
          category = ?,
          price = ?,
          unit = ?,
          image = ?,
          icon = ?,
          visible = ?,
          related = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        name,
        category,
        Number(price),
        unit || "dona",
        image || null,
        icon || "📦",
        visible === false ? 0 : 1,
        JSON.stringify(
          Array.isArray(related)
            ? related
            : []
        ),
        id
      )
      .run();

    return json({
      success: true,
      message: "Mahsulot yangilandi",
      id
    });

  } catch (error) {

    console.error(
      "❌ D1 PRODUCTS UPDATE ERROR:",
      error
    );

    return json(
      {
        error:
          "Mahsulotni yangilashda xatolik",
        message:
          error.message
      },
      500
    );
  }
}
    // =====================================================
// PRODUCTS DELETE
// =====================================================

if (
  url.pathname.startsWith("/products/") &&
  request.method === "DELETE"
) {

  try {

    const isAdmin =
      await verifyTelegramAdmin(
        request,
        env
      );

    if (!isAdmin) {
      return json(
        {
          error:
            "Ruxsat yo‘q"
        },
        403
      );
    }

    const id =
      Number(
        url.pathname.split("/").pop()
      );

    if (!id) {
      return json(
        {
          error: "Mahsulot ID kerak"
        },
        400
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM products
        WHERE id = ?
      `)
      .bind(id)
      .run();

    return json({
      success: true,
      message: "Mahsulot o‘chirildi",
      id
    });

  } catch (error) {

    console.error(
      "❌ D1 PRODUCTS DELETE ERROR:",
      error
    );

    return json(
      {
        error:
          "Mahsulotni o‘chirishda xatolik",
        message:
          error.message
      },
      500
    );
  }
}
    // =====================================================
// PRODUCT IMAGE GET
// =====================================================

if (
  url.pathname.startsWith("/product-images/") &&
  request.method === "GET"
) {

  try {

    const fileId =
      decodeURIComponent(
        url.pathname.replace(
          "/product-images/",
          ""
        )
      );

    if (!fileId) {
      return new Response(
        "Rasm topilmadi",
        {
          status: 404
        }
      );
    }


    // =================================================
    // TELEGRAM FILE PATH OLISH
    // =================================================

    const fileResponse =
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
      );

    const fileData =
      await fileResponse.json();


    if (
      !fileResponse.ok ||
      !fileData.ok ||
      !fileData.result?.file_path
    ) {

      console.error(
        "❌ TELEGRAM FILE PATH XATOSI:",
        fileData
      );

      return new Response(
        "Rasm topilmadi",
        {
          status: 404
        }
      );
    }


    const filePath =
      fileData.result.file_path;


    // =================================================
    // TELEGRAMDAN RASMNI OLISH
    // =================================================

    const imageResponse =
      await fetch(
        `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`
      );


    if (!imageResponse.ok) {

      console.error(
        "❌ TELEGRAM RASMNI OLISHDA XATO:",
        imageResponse.status
      );

      return new Response(
        "Rasmni olishda xatolik",
        {
          status: 500
        }
      );
    }


    // =================================================
    // RASMNI MINI APP'GA QAYTARISH
    // =================================================

    return new Response(
      imageResponse.body,
      {
        status: 200,

        headers: {
          "Content-Type":
            imageResponse.headers.get(
              "Content-Type"
            ) ||
            "application/octet-stream",

          "Cache-Control":
            "public, max-age=31536000"
        }
      }
    );


  } catch (error) {

    console.error(
      "❌ PRODUCT IMAGE GET ERROR:",
      error
    );

    return new Response(
      "Rasmni yuklashda xatolik",
      {
        status: 500
      }
    );
  }
}


    // =====================================================
    // MINI APP
    // =====================================================

    return env.ASSETS.fetch(
      request
    );
  }
};
