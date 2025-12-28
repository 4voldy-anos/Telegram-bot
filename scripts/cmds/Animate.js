const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const nix = {
  name: "animate",
  version: "1.0.0",
  aliases: ["anim", "genvid"],
  description: "Generate animated videos from text prompts using AI.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 30,
  guide: "{p}animate <prompt>\nExample: {p}animate a cat is swimming",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply("❗ Please provide a prompt.\nUsage: {p}animate <text>");
  }

  const prompt = args.join(" ").trim();
  const waitMsg = await message.reply("🎬 Generating video...");

  let tempFilePath;
  try {
    const apiUrl = `https://metakexbyneokex.fly.dev/animate?prompt=${encodeURIComponent(prompt)}`;
    const apiResponse = await axios.get(apiUrl, { timeout: 120000 });
    const data = apiResponse.data;

    if (!data.success || !data.video_urls?.length) {
      throw new Error(data.message || "API returned no video.");
    }

    const videoUrl = data.video_urls[0];
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });

    const fileName = `animate_${uuidv4()}.mp4`;
    tempFilePath = path.join(CACHE_DIR, fileName);
    fs.writeFileSync(tempFilePath, Buffer.from(videoResponse.data));

    await bot.editMessageText("📤 Sending video...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });

    await bot.sendVideo(chatId, fs.createReadStream(tempFilePath), {
      caption: `🎬 *Prompt:* ${prompt}`,
      parse_mode: "Markdown"
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("Animate Command Error:", err.message);
    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

module.exports = { nix, onStart };
