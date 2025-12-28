const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);
const API_ENDPOINT = "https://free-goat-api.onrender.com/4k";
const CACHE_DIR = path.join(__dirname, "cache");

const nix = {
  name: "4k",
  version: "1.1",
  description: "Upscale une image en résolution 4K avec IA",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 15,
  guide: "{p}4k <image_url> ou répondre à une image pour l'améliorer"
};

// Fonction pour récupérer l'URL de l'image depuis les args ou le reply
function getImageUrl({ args, msg }) {
  // 1️⃣ Vérifie si une URL est passée dans les arguments
  if (args.length) {
    const url = args.find(arg => arg.startsWith("http"));
    if (url) return url;
  }

  // 2️⃣ Vérifie si on répond à un message avec une photo
  const reply = msg.reply_to_message;
  if (reply && reply.attachments && reply.attachments.length > 0) {
    const imageAtt = reply.attachments.find(att => att.type === "photo" || att.type === "image");
    if (imageAtt && imageAtt.url) return imageAtt.url;
  }

  return null;
}

async function downloadImage(url, filepath) {
  const response = await axios({ url, responseType: "stream", timeout: 60000 });
  await streamPipeline(response.data, fs.createWriteStream(filepath));
}

async function onStart({ bot, message, chatId, args, msg }) {
  const imageUrl = getImageUrl({ args, msg });

  if (!imageUrl)
    return message.reply("❌ Fournis une URL d'image ou réponds à une image à améliorer.");

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const waitMsg = await message.reply("⏳ Upscaling en cours...");

  let tempFile;
  try {
    const apiUrl = `${API_ENDPOINT}?url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 45000 });

    if (!data.image) throw new Error("L'API n'a pas renvoyé d'image finale.");

    tempFile = path.join(CACHE_DIR, `upscale_4k_${Date.now()}.jpg`);
    await downloadImage(data.image, tempFile);

    await bot.editMessageText(`🖼️ Image améliorée en 4K !`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, fs.createReadStream(tempFile));

  } catch (err) {
    console.error("4K Upscale Command Error:", err.message);
    await bot.editMessageText(`❌ Échec de l'upscale : ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  } finally {
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

module.exports = { nix, onStart };
