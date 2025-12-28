const axios = require("axios");

const nix = {
  name: "fotor",
  version: "1.0.0",
  description: "Generate images using the Christus Fotor API.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}fotor",
};

async function onStart({ bot, message, chatId, args }) {
  // Message de chargement
  const waitMsg = await message.reply("🎨 Generating image...");

  try {
    const apiUrl = "https://christus-api.vercel.app/image/fotor";
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.status || !res.data.image_url) {
      throw new Error("API returned no usable image.");
    }

    const imageUrl = res.data.image_url;

    await bot.editMessageText("📤 Sending image...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });

    await bot.sendPhoto(chatId, imageUrl, {
      caption: "🖼️ *Fotor Image*",
      parse_mode: "Markdown",
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("Fotor Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

module.exports = { nix, onStart };
