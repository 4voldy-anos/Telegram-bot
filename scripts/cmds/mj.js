const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const stream = require("stream");
const { promisify } = require("util");

const pipeline = promisify(stream.pipeline);
const API_ENDPOINT = "https://dev.oculux.xyz/api/mj-proxy-pub";

const nix = {
  name: "midjourney",
  version: "20.0",
  aliases: ["mj"],
  description: "Generate 4 MidJourney images and select one by replying.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 20,
  guide: "{p}midjourney <prompt>. Reply U1-U4 or V1-V4 to select an image."
};

async function downloadSingleImage(url, tempDir, index) {
  let tempFilePath = '';
  try {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
      timeout: 120000
    });

    tempFilePath = path.join(tempDir, `mj_${Date.now()}_${index}.jpg`);
    await pipeline(response.data, fs.createWriteStream(tempFilePath));

    return { path: tempFilePath };
  } catch (err) {
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    throw new Error("Failed to download the image.");
  }
}

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ");
  if (!prompt) {
    return message.reply("❌ Please provide a prompt.\nUsage: {p}midjourney <prompt>");
  }

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirpSync(cacheDir);

  const waitMsg = await message.reply("⏳ Generating 4 MidJourney images...");

  try {
    const apiResponse = await axios.get(`${API_ENDPOINT}?prompt=${encodeURIComponent(prompt)}&usepolling=false`, { timeout: 300000 });
    const data = apiResponse.data;

    if (!data.status || data.status === "failed" || !data.results || data.results.length < 4) {
      throw new Error(data.message || "API did not return enough images (expected 4).");
    }

    const finalUrls = data.results.slice(0, 4);
    const attachments = [];
    const tempPaths = [];

    for (let i = 0; i < finalUrls.length; i++) {
      const result = await downloadSingleImage(finalUrls[i], cacheDir, i + 1);
      attachments.push(fs.createReadStream(result.path));
      tempPaths.push(result.path);
    }

    await bot.editMessageText("✅ Images generated. Sending...", { chat_id: chatId, message_id: waitMsg.message_id });

    const sentMessage = await bot.sendPhoto(chatId, attachments, {
      caption: `✨ MidJourney images generated for prompt: "${prompt}". Reply U1-U4 or V1-V4 to select.`,
    });

    // Setup reply tracking
    global.GoatBot.onReply.set(sentMessage.message_id, {
      commandName: nix.name,
      author: message.senderID,
      imageUrls: finalUrls,
      tempPaths: tempPaths
    });

  } catch (err) {
    console.error("MidJourney Command Error:", err.message);
    await bot.editMessageText(`❌ Image generation failed: ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
  }
}

async function onReply({ bot, message, chatId, event, Reply }) {
  const { imageUrls, tempPaths } = Reply;
  const cacheDir = path.join(__dirname, "cache");
  let tempImagePath = "";

  try {
    const userReply = event.body.trim().toUpperCase();
    const match = userReply.match(/^(U|V)([1-4])$/);

    if (!match) return;

    const index = parseInt(match[2]) - 1;
    if (index >= imageUrls.length) return message.reply("❌ Invalid selection index.");

    const selectedUrl = imageUrls[index];
    const result = await downloadSingleImage(selectedUrl, cacheDir, `final_${index + 1}`);
    tempImagePath = result.path;

    await bot.sendPhoto(chatId, tempImagePath, { caption: "✨ Here is your selected image." });

  } catch (err) {
    console.error("Selection Download Error:", err.message);
    message.reply(`❌ Failed to retrieve selected image: ${err.message}`);
  } finally {
    const cleanup = async () => {
      if (tempImagePath && fs.existsSync(tempImagePath)) await fs.unlink(tempImagePath).catch(() => {});
      if (tempPaths) await Promise.all(tempPaths.map(p => fs.unlink(p).catch(() => {})));
    };
    cleanup().catch(() => {});
  }
}

module.exports = { nix, onStart, onReply };
