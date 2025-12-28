const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CACHE_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const nix = {
  name: "nude",
  aliases: ["nudepic"],
  version: "1.0",
  author: "Christus Dev AI | Redwan API",
  description: "Fetch a random image from Nude API",
  prefix: false,
  category: "AI",
  type: "anyone",
  cooldown: 5,
  guide: "{p}nude"
};

async function onStart({ bot, message, chatId }) {
  const waitMsg = await message.reply("⏳ Fetching image, please wait...");

  try {
    const { data } = await axios.get("https://christus-api.vercel.app/nsfw/Nude", { timeout: 60000 });

    if (!data?.status || !data?.imageUrl) throw new Error("API did not return an image.");

    await bot.editMessageText(`✅ Image fetched successfully!\nPowered by: ${data.creator}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, data.imageUrl);

  } catch (err) {
    console.error("Nude Command Error:", err.message || err);
    await bot.editMessageText(`❌ Failed to fetch image: ${err.message || err}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
