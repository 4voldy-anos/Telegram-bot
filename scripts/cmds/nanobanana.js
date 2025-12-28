const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const nix = {
  name: "nanobanana",
  version: "1.0",
  aliases: ["nb"],
  description: "Generate an AI image using the NanoBanana API.",
  author: "Christus | API Renz",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}nanobanana <prompt>"
};

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ");
  if (!prompt) {
    return message.reply(
      "⚠️ Please provide a prompt.\nUsage: {p}nanobanana <prompt>"
    );
  }

  const waitMsg = await message.reply("⏳ Generating your NanoBanana image...");

  const cacheDir = path.join(__dirname, "cache");
  const imgPath = path.join(cacheDir, `${Date.now()}_nanobanana.jpg`);
  const seed = 12345;

  try {
    await fs.ensureDir(cacheDir);

    const apiURL = `https://dev.oculux.xyz/api/nanobanana?prompt=${encodeURIComponent(prompt)}&seed=${seed}`;
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
    console.error("NanoBanana Command Error:", err.message);
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
