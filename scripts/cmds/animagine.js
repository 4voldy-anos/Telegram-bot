const axios = require("axios");

const nix = {
  name: "animagine",
  version: "1.1.0",
  aliases: ["ani", "animegen"],
  description: "Generate safe anime-style images using Christus API.",
  author: "Christus",
  prefix: false,
  category: "Image",
  type: "anyone",
  cooldown: 10,
  guide: "{p}animagine <prompt>\nExample: {p}animagine a cute anime girl with a sword",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply(
      "❗ Please provide a prompt.\nUsage: {p}animagine <text>"
    );
  }

  const prompt = args.join(" ");

  const waitMsg = await message.reply("🎨 Generating anime-style image...");

  try {
    const apiUrl = `https://christus-api.vercel.app/image/animagine?prompt=${encodeURIComponent(prompt)}`;
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.status || !res.data.image_url) {
      throw new Error("API returned no usable image URL.");
    }

    const imageUrl = res.data.image_url;

    await bot.editMessageText("📤 Sending image...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🖼️ *Prompt:* ${prompt}`,
      parse_mode: "Markdown",
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);
  } catch (err) {
    console.error("Animagine Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

module.exports = { nix, onStart };
