const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const nix = {
  name: "4k",
  aliases: ["upscale", "hd", "enhance"],
  version: "1.0.1",
  description: "Upscale an image to higher resolution (AI 4K enhancement).",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 15,
  guide: "{p}4k <image_url> ou répondre à une image",
};

async function onStart({ bot, message, chatId, args, event }) {
  // Vérifie que l'image existe : soit URL, soit reply à un message contenant une photo
  const imageUrl =
    args.find(arg => arg.startsWith("http")) ||
    (event && event.messageReply && event.messageReply.attachments
      ? event.messageReply.attachments.find(att => att.type === "photo")?.url
      : null);

  if (!imageUrl) {
    return message.reply("❌ Fournis une URL d’image **ou** réponds à une image pour l’améliorer.");
  }

  const waitMsg = await message.reply("🖼️ Amélioration de l’image en cours (4K)... ⏳");
  let filePath;

  try {
    const apiRes = await axios.get("https://free-goat-api.onrender.com/4k", {
      params: { url: imageUrl },
      timeout: 45000,
    });

    if (!apiRes.data?.image) throw new Error("API returned no image.");

    const enhancedUrl = apiRes.data.image;
    filePath = path.join(CACHE_DIR, `upscale_4k_${uuidv4()}.jpg`);

    const imgStream = await axios.get(enhancedUrl, { responseType: "arraybuffer", timeout: 60000 });
    fs.writeFileSync(filePath, Buffer.from(imgStream.data));

    await bot.editMessageText("📤 Envoi de l’image améliorée...", { chat_id: chatId, message_id: waitMsg.message_id });
    await bot.sendPhoto(chatId, filePath, { caption: "🖼️ Image améliorée en 4K avec succès" });
    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("4K Upscale Error:", err.message);
    await bot.editMessageText(`❌ Impossible d’améliorer l’image. ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

module.exports = { nix, onStart };
