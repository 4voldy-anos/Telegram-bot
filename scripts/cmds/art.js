const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const nix = {
  name: "art",
  aliases: ["artv1", "draw"],
  version: "1.1.0",
  description: "Generate an image using the ArtV1 AI model",
  author: "Christus",
  prefix: false,
  category: "ai-image",
  type: "anyone",
  cooldown: 15,
  guide: "{p}art <prompt>",
};

async function onStart({ bot, message, chatId, args, event }) {
  const prompt = args.join(" ").trim();
  if (!prompt || !/^[\x00-\x7F]*$/.test(prompt)) {
    return message.reply("❌ Please provide a valid English prompt to generate an image.");
  }

  const waitMsg = await message.reply("🎨 Generating image with ArtV1... ⏳");
  let tempFilePath;

  try {
    const apiUrl = `https://dev.oculux.xyz/api/artv1?p=${encodeURIComponent(prompt)}`;

    const response = await axios.get(apiUrl, { responseType: "stream", timeout: 60000 });
    if (response.status !== 200) throw new Error(`API request failed with status code ${response.status}`);

    tempFilePath = path.join(CACHE_DIR, `artv1_${uuidv4()}.png`);
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", (err) => { writer.close(); reject(err); });
    });

    await bot.editMessageText("📤 Sending generated image...", { chat_id: chatId, message_id: waitMsg.message_id });
    await bot.sendPhoto(chatId, tempFilePath, { caption: `✨ ArtV1 image generated for prompt:\n"${prompt}"` });
    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("ArtV1 Command Error:", err);
    await bot.editMessageText(`❌ Failed to generate image: ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}

module.exports = { nix, onStart };
