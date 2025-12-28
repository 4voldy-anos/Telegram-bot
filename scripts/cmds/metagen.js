const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { v4: uuidv4 } = require("uuid");

const API_ENDPOINT = "https://metakexbyneokex.fly.dev/images/generate";
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const nix = {
  name: "metagen",
  aliases: ["metaimg"],
  version: "1.0.0",
  description: "Generate a grid of 4 images from a text prompt using Meta.AI.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 20,
  guide: "{p}metagen <prompt>\nExample: {p}metagen a cute cat playing with yarn",
};

async function downloadImage(url, filePath) {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  fs.writeFileSync(filePath, Buffer.from(response.data));
  return filePath;
}

async function createGridImage(imagePaths, outputPath) {
  const images = await Promise.all(imagePaths.map(p => loadImage(p)));
  const imgWidth = images[0].width;
  const imgHeight = images[0].height;
  const padding = 10;
  const canvasWidth = imgWidth * 2 + padding * 3;
  const canvasHeight = imgHeight * 2 + padding * 3;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const positions = [
    { x: padding, y: padding },
    { x: imgWidth + padding * 2, y: padding },
    { x: padding, y: imgHeight + padding * 2 },
    { x: imgWidth + padding * 2, y: imgHeight + padding * 2 },
  ];

  for (let i = 0; i < images.length && i < 4; i++) {
    const { x, y } = positions[i];
    ctx.drawImage(images[i], x, y, imgWidth, imgHeight);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.arc(x + 40, y + 40, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((i + 1).toString(), x + 40, y + 40);
  }

  fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
  return outputPath;
}

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ").trim();
  if (!prompt) return message.reply("❗ Please provide a prompt.\nUsage: {p}metagen <text>");

  const waitMsg = await message.reply("🎨 Generating 4 images...");

  const tempPaths = [];
  const outputPath = path.join(CACHE_DIR, `meta_grid_${uuidv4()}.png`);

  try {
    const res = await axios.post(API_ENDPOINT, { prompt }, { timeout: 150000 });
    const data = res.data;

    if (!data.success || !data.images?.length) {
      throw new Error(data.message || "API returned no images.");
    }

    const imageUrls = data.images.slice(0, 4).map(img => img.url);
    for (let i = 0; i < imageUrls.length; i++) {
      const tempFile = path.join(CACHE_DIR, `meta_${uuidv4()}.png`);
      await downloadImage(imageUrls[i], tempFile);
      tempPaths.push(tempFile);
    }

    await createGridImage(tempPaths, outputPath);

    await bot.editMessageText("📤 Sending image grid...", { chat_id: chatId, message_id: waitMsg.message_id });
    await bot.sendPhoto(chatId, outputPath, {
      caption: `✨ Meta AI generated 4 images for prompt:\n"${prompt}"`,
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);
  } catch (err) {
    console.error("MetaGen Command Error:", err.message);
    await bot.editMessageText(`⚠️ Error: ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
  } finally {
    // Cleanup temp files
    [...tempPaths, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  }
}

module.exports = { nix, onStart };
