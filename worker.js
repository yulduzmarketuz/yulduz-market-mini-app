const MINI_APP_URL =
  "https://yulduz-market-mini-app.pardayevx055.workers.dev";

const YESPOS_BASE_URL =
  "https://marketplace.yestask.uz/api/v1";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function yesposFetch(path, env, options = {}) {
  const headers = {
    "API-Key": env.YESPOS_API_KEY,
    "Content-Type": "application/json",
    ...options.headers
  };

  return fetch(`${YESPOS_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(options.body || {})
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
// TELEGRAM WEBHOOK
// =========================
if (
  url.pathname === "/telegram-webhook" &&
  request.method === "POST"
) {
  try {
    const update = await request.json();

    // =========================
    // USER MESSAGE
    // =========================
    const message = update.message;

    if (message) {

      const chatId =
  message.chat?.id;

console.log(
  "🔥 ADMIN CHAT ID:",
  chatId
);

const user =
  message.from;

      // =========================
      // CONTACT → D1
      // =========================
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

      // =========================
      // /start
      // =========================
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
                        "🛒 HARIDLARNI BOSHLASH",
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

    // =========================
    // D1: SAVE CUSTOMER
    // =========================
    if (
      url.pathname === "/customer" &&
      request.method === "POST"
    ) {
      try {
        const data = await request.json();

        const telegramId =
          data.telegram_id?.toString();

        if (!telegramId) {
          return json(
            {
              error: "telegram_id kerak"
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
        console.error("D1 customer error:", error);

        return json(
          {
            error: "Mijozni saqlashda xatolik",
            message: error.message
          },
          500
        );
      }
    }

    // =========================
    // D1: GET CUSTOMER
    // =========================
    if (
      url.pathname === "/customer" &&
      request.method === "GET"
    ) {
      try {
        const telegramId =
          url.searchParams.get("telegram_id");

        if (!telegramId) {
          return json(
            {
              error: "telegram_id kerak"
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
          customer: result || null
        });

      } catch (error) {
        console.error("D1 customer GET error:", error);

        return json(
          {
            error: "Mijozni olishda xatolik",
            message: error.message
          },
          500
        );
      }
    }
    // =========================
// D1: ADDRESSES
// =========================

// GET ADDRESSES
if (
  url.pathname === "/addresses" &&
  request.method === "GET"
) {
  try {

    const telegramId =
      url.searchParams.get("telegram_id");

    if (!telegramId) {
      return json(
        {
          error: "telegram_id kerak"
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
      addresses: result.results || []
    });

  } catch (error) {

    console.error(
      "D1 addresses GET error:",
      error
    );

    return json(
      {
        error: "Manzillarni olishda xatolik",
        message: error.message
      },
      500
    );
  }
}


// POST ADDRESS
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
          error: "telegram_id kerak"
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
      id: result.meta?.last_row_id || null
    });

  } catch (error) {

    console.error(
      "D1 addresses POST error:",
      error
    );

    return json(
      {
        error: "Manzilni saqlashda xatolik",
        message: error.message
      },
      500
    );
  }
}


// DELETE ADDRESS
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
          error: "telegram_id kerak"
        },
        400
      );
    }

    if (!addressId) {
      return json(
        {
          error: "address id kerak"
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
        error: "Manzilni o‘chirishda xatolik",
        message: error.message
      },
      500
    );
  }
}

// =========================
// D1: CREATE ORDER
// =========================
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
          error: "telegram_id kerak"
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

    const orderNumber =
      `YLZ-${Date.now()}`;

    // =========================
    // BUYURTMA D1 GA SAQLANADI
    // =========================

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

          JSON.stringify(data.items),

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

          data.payment_method || "cash",
          data.payment_status || "pending",

          "yangi",

          "pending"
        )
        .run();

    console.log(
      "✅ BUYURTMA D1 GA SAQLANDI:",
      orderNumber,
      telegramId
    );


    // =========================
    // TELEGRAM ADMIN XABARI
    // =========================

    try {

      const customerName =
        `${data.first_name || ""} ${data.last_name || ""}`
          .trim() || "Noma'lum mijoz";

      const username =
        data.username
          ? `@${String(data.username).replace(/^@/, "")}`
          : "Username yo‘q";

      const phone =
        data.phone || "Telefon yo‘q";

      const address =
        data.address_name || "Lokatsiya";

      const payment =
        data.payment_method === "cash"
          ? "Naqd"
          : data.payment_method || "Noma'lum";

      let itemsText = "";

      data.items.forEach(
        (item, index) => {

          const name =
            item.name ||
            item.title ||
            "Mahsulot";

          const quantity =
            Number(item.quantity || 0);

          const price =
            Number(item.price || 0);

          const itemTotal =
            price * quantity;

          itemsText +=
    `${index + 1}. ${name}\n` +
    `   ${quantity} dona × ${price.toLocaleString("uz-UZ")} so‘m = ${itemTotal.toLocaleString("uz-UZ")} so‘m\n`;

        }
      );


      const adminMessage =
`🛒 YANGI BUYURTMA

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

${data.address_extra
  ? `📝 Qo‘shimcha: ${data.address_extra}\n`
  : ""}${data.note
  ? `💬 Izoh: ${data.note}\n`
  : ""}
🟡 Holat: Yangi`;


      const telegramResponse =
        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              chat_id:
                env.ADMIN_CHAT_ID,

              text:
                adminMessage
            })
          }
        );


      if (!telegramResponse.ok) {

        const telegramError =
          await telegramResponse.text();

        console.error(
          "❌ ADMIN TELEGRAM XABAR XATOSI:",
          telegramError
        );

      } else {

        console.log(
          "✅ ADMIN TELEGRAMGA BUYURTMA YUBORILDI:",
          orderNumber
        );

      }

    } catch (telegramError) {

      console.error(
        "❌ Telegram admin notification error:",
        telegramError
      );

    }


    // =========================
    // MINI APP GA JAVOB
    // =========================

    return json({
      success: true,

      order: {

        id:
          result.meta?.last_row_id || null,

        order_number:
          orderNumber,

        status:
          "yangi"

      }

    });

  } catch (error) {

    console.error(
      "D1 order error:",
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

    // =========================
    // YESPOS: BRANCH LIST
    // =========================
    if (
      url.pathname === "/yespos-branches" &&
      request.method === "GET"
    ) {
      try {
        const response = await yesposFetch(
          "/branch/list",
          env
        );

        const text = await response.text();

        return new Response(text, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (error) {
        return json(
          {
            error: "YESPOS branch xatosi",
            message: error.message
          },
          500
        );
      }
    }

    // =========================
    // YESPOS: PRODUCTS
    // =========================
    if (
      url.pathname === "/yespos-products" &&
      request.method === "GET"
    ) {
      try {
        const response = await yesposFetch(
          "/marketplace/products",
          env
        );

        const text = await response.text();

        return new Response(text, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (error) {
        return json(
          {
            error: "YESPOS products xatosi",
            message: error.message
          },
          500
        );
      }
    }

    // =========================
    // YESPOS: PRODUCTS INFO
    // =========================
    if (
      url.pathname === "/yespos-products-info" &&
      request.method === "GET"
    ) {
      try {
        const branch =
          url.searchParams.get("branch");

        const page =
          url.searchParams.get("page") || "1";

        const limit =
          url.searchParams.get("limit") || "100";

        if (!branch) {
          return json(
            {
              error: "branch kerak"
            },
            400
          );
        }

        const response = await yesposFetch(
          `/marketplace/products/info?page=${page}&limit=${limit}`,
          env,
          {
            headers: {
              "Branch": branch
            }
          }
        );

        const text = await response.text();

        return new Response(text, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (error) {
        return json(
          {
            error: "YESPOS products info xatosi",
            message: error.message
          },
          500
        );
      }
    }

    // =========================
    // YESPOS: ORDER
    // =========================
    if (
      url.pathname === "/yespos-order" &&
      request.method === "POST"
    ) {
      try {
        const order = await request.json();

        const response = await yesposFetch(
          "/marketplace/order",
          env,
          {
            headers: {
              "AppName": "Yulduz Market Mini App"
            },
            body: order
          }
        );

        const text = await response.text();

        return new Response(text, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (error) {
        return json(
          {
            error: "YESPOS order xatosi",
            message: error.message
          },
          500
        );
      }
    }

    // =========================
    // MINI APP
    // =========================
    return env.ASSETS.fetch(request);
  }
};
