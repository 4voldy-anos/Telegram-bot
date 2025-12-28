const axios = require("axios");

const nix = {
  name: "kanda",
  aliases: ["kandavideo", "knd"],
  version: "1.0",
  author: "Christus",
  description: "Fetch a random NSFW video from Kanda API",
  prefix: false,
  category: "nsfw",
  type: "anyone",
  cooldown: 10,
  guide: "{p}kanda"
};

async function onStart({ bot, message, chatId }) {
  const waitMsg = await message.reply("⏳ Fetching NSFW video, please wait...");

  try {
    const { data } = await axios.get("https://christus-api.vercel.app/nsfw/Kanda", { timeout: 60000 });

    if (!data.status || !data.videoUrl) throw new Error("API did not return a video.");

    await bot.editMessageText(`✅ Video fetched successfully!\nPowered by: ${data.creator}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendVideo(chatId, data.videoUrl);

  } catch (err) {
    console.error("Kanda CMD Error:", err.message || err);
    await bot.editMessageText(`❌ Failed to fetch video: ${err.message || err}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
