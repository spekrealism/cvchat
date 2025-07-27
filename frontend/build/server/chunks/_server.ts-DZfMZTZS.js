import { j as json, d as private_env } from './index-BFZUi3Db.js';

const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const { purpose, contact } = data;
    if (!purpose || !contact) {
      return json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    const message = `
📩 Новая заявка на сотрудничество:

🎯 Цель: ${purpose}

📞 Контакт: ${contact}
    `;
    const TELEGRAM_BOT_TOKEN = private_env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = private_env.TELEGRAM_CHAT_ID;
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML"
        })
      }
    );
    const telegramData = await telegramResponse.json();
    if (!telegramData.ok) {
      console.error("Error sending message to Telegram:", telegramData);
      return json({ success: false, message: "Failed to send to Telegram" }, { status: 500 });
    }
    return json({ success: true });
  } catch (error) {
    console.error("Error processing form submission:", error);
    return json({ success: false, message: "Server error" }, { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-DZfMZTZS.js.map
