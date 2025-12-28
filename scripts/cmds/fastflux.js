const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "fastflux",
  version: "1.0",
  aliases: ["fflux"],
  description: "Generate an AI image using the FastFlux API.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}fastflux <prompt>"
};

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ");
  if (!prompt) {
    return message.reply(
      "⚠️ Please provide a prompt.\nUsage: {p}fastflux <prompt>"
    );
  }

  const waitMsg = await message.reply("⏳ Generating your FastFlux image...");

  const cacheDir = path.join(__dirname, "cache");
  const imgPath = path.join(cacheDir, `${Date.now()}_fastflux.jpg`);

  try {
    await fs.ensureDir(cacheDir);

    // URL de l'API FastFlux
    const apiURL = `https://christus-api.vercel.app/image/fastflux?prompt=${encodeURIComponent(prompt)}`;
    const res = await axios.get(apiURL, { responseType: "arraybuffer" });

    await fs.writeFile(imgPath, Buffer.from(res.data, "binary"));

    await bot.editMessageText("✅ Image generated successfully!", {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, imgPath, {
      caption: `✨ Image generated for prompt: "${prompt}"`
    });

  } catch (err) {
    console.error("FastFlux Command Error:", err.message);
    await bot.editMessageText(`❌ Failed to generate image: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  } finally {
    if (fs.existsSync(imgPath)) {
      await fs.remove(imgPath).catch(() => {});
    }
  }
}

module.exports = { nix, onStart };
