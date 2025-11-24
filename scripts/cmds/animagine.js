const axios = require("axios");

const nix = {
  name: "animagine",
  version: "1.0.0",
  aliases: ["ani", "animegen"],
  description: "Generate safe anime-style images using Animagine XL API.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 10,
  guide: "{p}animagine <prompt> [ratio]\nExample: {p}animagine futuristic samurai 1:1",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply(
      "❗ Please provide a prompt.\nUsage: {p}animagine <text> [ratio]"
    );
  }

  // Default ratio
  let ratio = "1:1";

  // Detect ratio argument
  const last = args[args.length - 1];
  if (/^\d+:\d+$/.test(last)) {
    ratio = last;
    args.pop();
  }

  const prompt = args.join(" ");

  const waitMsg = await message.reply("🎨 Generating anime-style image...");

  try {
    const apiUrl = `https://api.nekolabs.web.id/ai/animagine/xl-4.0?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.success || !res.data.result) {
      throw new Error("API returned no usable image URL.");
    }

    const imageUrl = res.data.result;

    await bot.editMessageText("📤 Sending image...", {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🖼️ *Prompt:* ${prompt}\n📐 Ratio: ${ratio}`,
      parse_mode: "Markdown"
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("Animagine Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
