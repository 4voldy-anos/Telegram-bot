const axios = require("axios");

const nix = {
  name: "cdp",
  version: "1.0.0",
  description: "Get anime character images from the Christus CDP API.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}cdp",
};

async function onStart({ bot, message, chatId, args }) {
  // Message de chargement
  const waitMsg = await message.reply("🎨 Fetching character images...");

  try {
    const apiUrl = "https://christus-api.vercel.app/image/CDP";
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.status || !res.data.avatar?.length) {
      throw new Error("API returned no usable images.");
    }

    const { character, anime, avatar } = res.data;
    const imageUrl = avatar[0]; // On prend la première image par défaut

    await bot.editMessageText("📤 Sending image...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🖼️ *Character:* ${character}\n📺 *Anime:* ${anime}`,
      parse_mode: "Markdown",
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("CDP Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

module.exports = { nix, onStart };
