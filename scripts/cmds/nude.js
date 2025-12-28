const axios = require("axios");

const nix = {
  name: "nude",
  version: "1.0",
  author: "Christus",
  description: "Envoie une image NSFW aléatoire (Nude).",
  prefix: false,
  category: "nsfw",
  type: "anyone",
  cooldown: 5,
  guide: "{p}nude"
};

async function onStart({ bot, message, chatId }) {
  const waitMsg = await message.reply("⏳ Génération de l'image...");

  try {
    const { data } = await axios.get("https://christus-api.vercel.app/nsfw/Nude");

    if (!data.status || !data.imageUrl) {
      throw new Error("L'API n'a pas renvoyé d'image.");
    }

    await bot.editMessageText(`✅ Image NSFW générée par ${data.creator}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, data.imageUrl);

  } catch (err) {
    console.error("NSFW Nude CMD Error:", err.message);
    await bot.editMessageText(`❌ Impossible de récupérer l'image : ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
