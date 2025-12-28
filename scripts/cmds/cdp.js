const axios = require("axios");
const { getStreamFromURL } = global.utils; // Assure que cette fonction existe pour récupérer les streams
const nix = {
  name: "cdp",
  aliases: ["coupledp"],
  version: "1.0.0",
  description: "Envoie un DP de couple aléatoire",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}cdp",
};

async function onStart({ bot, message, chatId }) {
  const waitMsg = await message.reply("💑 Génération du DP de couple... ⏳");

  try {
    const res = await axios.get("https://xsaim8x-xxx-api.onrender.com/api/cdp2");
    const { boy, girl } = res.data;

    await bot.editMessageText("📤 Envoi du DP de couple...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });

    await bot.sendPhoto(chatId, [await getStreamFromURL(boy), await getStreamFromURL(girl)], {
      caption: "💑 Voici ton DP de couple ! 😘✨",
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("CDP Command Error:", err.message);
    await bot.editMessageText("❌ Impossible de récupérer le DP de couple.", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

module.exports = { nix, onStart };
