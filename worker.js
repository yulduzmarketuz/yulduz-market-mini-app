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

        if (update.message?.text === "/start") {
          const chatId = update.message.chat.id;
          const user = update.message.from;

          const username = user.username
            ? `@${user.username}`
            : user.first_name || "mijoz";

          const text = `⭐ YULDUZ MARKET

Salom, ${username}! 👋

Xaridlaringizni uydan chiqmasdan amalga oshiring.

Buyurtmangizni tayyorlab, manzilingizga yetkazamiz. 🚚`;

          await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: chatId,
                text,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "🛒 HARIDLARNI BOSHLASH",
                        web_app: {
                          url: MINI_APP_URL
                        }
                      }
                    ]
                  ]
                }
              })
            }
          );
        }

        return new Response("OK");
      } catch (error) {
        console.error("Telegram webhook error:", error);
        return new Response("Webhook error", {
          status: 500
        });
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
        const branch = url.searchParams.get("branch");
        const page = url.searchParams.get("page") || "1";
        const limit = url.searchParams.get("limit") || "100";

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
