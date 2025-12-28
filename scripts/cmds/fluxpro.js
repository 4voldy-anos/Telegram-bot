const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "fluxpro",
  version: "1.0",
  aliases: ["fp"],
  description: "Generate an AI image using the FluxPro API.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}fluxpro <prompt>"
};

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ");
  if (!prompt) {
    return message.reply(
      "⚠️ Please provide a prompt.\nUsage: {p}fluxpro <prompt>"
    );
  }

  const waitMsg = await message.reply("⏳ Generating your FluxPro image...");

  const cacheDir = path.join(__dirname, "cache");
  const imgPath = path.join(cacheDir, `${Date.now()}_fluxpro.jpg`);

  try {
    await fs.ensureDir(cacheDir);

    // URL de l'API FluxPro
    const apiURL = `https://christus-api.vercel.app/image/fluxpro?prompt=${encodeURIComponent(prompt)}`;
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
    console.error("FluxPro Command Error:", err.message);
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
