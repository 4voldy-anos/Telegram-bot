const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { v4: uuidv4 } = require("uuid");

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const nix = {
  name: "metagen",
  aliases: ["metaimg"],
  version: "1.1.0",
  description: "Generate a grid of 4 images from a prompt and choose one or all.",
  author: "Christus",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 20,
  guide: "{p}metagen <prompt>\nReply 1-4 to select an image or 'all' to get all images",
};

// ------------------ UTILITIES ------------------

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

// ------------------ COMMAND ------------------

async function onStart({ bot, message, chatId, args }) {
  const prompt = args.join(" ").trim();
  if (!prompt) return message.reply("❗ Please provide a prompt.\nUsage: {p}metagen <text>");

  const waitMsg = await message.reply("🎨 Generating 4 images...");

  const tempPaths = [];
  let gridPath;
  let imageUrls = [];

  try {
    const res = await axios.post("https://metakexbyneokex.fly.dev/images/generate", { prompt }, { timeout: 150000 });
    const data = res.data;

    if (!data.success || !data.images?.length) throw new Error(data.message || "No images returned.");
    imageUrls = data.images.slice(0, 4).map(img => img.url);

    for (let i = 0; i < imageUrls.length; i++) {
      const tempFile = path.join(CACHE_DIR, `meta_${uuidv4()}.png`);
      await downloadImage(imageUrls[i], tempFile);
      tempPaths.push(tempFile);
    }

    gridPath = path.join(CACHE_DIR, `meta_grid_${uuidv4()}.png`);
    await createGridImage(tempPaths, gridPath);

    const sentMsg = await bot.sendPhoto(chatId, gridPath, {
      caption: `✨ Meta AI generated 4 images for prompt:\n"${prompt}"\n\nReply with 1,2,3,4 to select an image or "all" to get all images`,
    });

    // Store context for reply
    global.GoatBot.onReply.set(sentMsg.message_id, {
      commandName: "metagen",
      author: chatId,
      imageUrls,
      tempPaths,
      gridPath,
      prompt,
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error("MetaGen Command Error:", err.message);
    await bot.editMessageText(`⚠️ Error: ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
    [...tempPaths, gridPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  }
}

async function onReply({ bot, message, chatId, event, Reply }) {
  if (event.senderID !== Reply.author) return;

  const userReply = event.body.trim().toLowerCase();
  const selectedPaths = [];

  try {
    if (userReply === "all") {
      for (let i = 0; i < Reply.imageUrls.length; i++) {
        const filePath = path.join(CACHE_DIR, `meta_selected_all_${uuidv4()}.png`);
        await downloadImage(Reply.imageUrls[i], filePath);
        selectedPaths.push(filePath);
      }

      await bot.sendMediaGroup(chatId, selectedPaths.map(p => ({ type: "photo", media: fs.createReadStream(p) })));

    } else {
      const sel = parseInt(userReply);
      if (!sel || sel < 1 || sel > Reply.imageUrls.length) return;

      const filePath = path.join(CACHE_DIR, `meta_selected_${uuidv4()}.png`);
      await downloadImage(Reply.imageUrls[sel - 1], filePath);
      selectedPaths.push(filePath);

      await bot.sendPhoto(chatId, filePath, { caption: `✨ Selected image from prompt:\n"${Reply.prompt}"` });
    }
  } catch (err) {
    console.error("MetaGen Reply Error:", err.message);
    message.reply(`❌ Failed to retrieve selected image: ${err.message}`);
  } finally {
    // Cleanup
    [...selectedPaths, ...Reply.tempPaths, Reply.gridPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
    global.GoatBot.onReply.delete(Reply.messageID);
  }
}

module.exports = { nix, onStart, onReply };
