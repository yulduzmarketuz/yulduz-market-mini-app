const MINI_APP_URL = "https://yulduz-market-mini-app.pardayevx055.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Telegram webhook
    if (url.pathname === "/telegram-webhook" && request.method === "POST") {
      const update = await request.json();

      if (update.message?.text === "/start") {
        const chatId = update.message.chat.id;

        const user = update.message.from;

        const username = user.username
          ? `@${user.username}`
          : user.first_name || "mijoz";

        const text =
` YULDUZ MARKET

Salom, ${username}! 👋

Xaridlaringizni uydan chiqmasdan amalga oshiring.

Buyurtmangizni tayyorlab, manzilingizga yetkazamiz. 🚚

`;

        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: text,
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
    }

    // Mini App fayllari
    return env.ASSETS.fetch(request);
  }
};
