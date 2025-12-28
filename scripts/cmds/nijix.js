const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);

const aspectRatioMap = {
  "1:1": { width: 1024, height: 1024 },
  "9:7": { width: 1152, height: 896 },
  "7:9": { width: 896, height: 1152 },
  "19:13": { width: 1216, height: 832 },
  "13:19": { width: 832, height: 1216 },
  "7:4": { width: 1344, height: 768 },
  "4:7": { width: 768, height: 1344 },
  "12:5": { width: 1500, height: 625 },
  "5:12": { width: 640, height: 1530 },
  "16:9": { width: 1344, height: 756 },
  "9:16": { width: 756, height: 1344 },
  "2:3": { width: 1024, height: 1536 },
  "3:2": { width: 1536, height: 1024 }
};

const nix = {
  name: "nijix",
  version: "1.2",
  author: "Christus",
  description: "Anime-style image generation with style, preset, and aspect ratio support.",
  prefix: false,
  category: "image",
  type: "anyone",
  cooldown: 5,
  guide: "{p}nijix <prompt> [--ar <ratio>] [--style <id>] [--preset <id>]"
};

async function onStart({ bot, message, chatId, args }) {
  let prompt = args.join(" ");

  const styleMatch = prompt.match(/--style (\d+)/);
  const presetMatch = prompt.match(/--preset (\d+)/);
  const arMatch = prompt.match(/--ar (\d+:\d+)/);

  const styleIndex = styleMatch ? styleMatch[1] : "0";
  const presetIndex = presetMatch ? presetMatch[1] : "0";
  const aspectRatio = arMatch ? arMatch[1] : "1:1";

  prompt = prompt
    .replace(/--style \d+/, "")
    .replace(/--preset \d+/, "")
    .replace(/--ar \d+:\d+/, "")
    .trim();

  if (!prompt) return message.reply("❌ Please provide a valid prompt.");

  const resolution = aspectRatioMap[aspectRatio] || aspectRatioMap["1:1"];
  const session_hash = Math.random().toString(36).substring(2, 13);
  const randomSeed = Math.floor(Math.random() * 1000000000);

  const payload = {
    data: [
      prompt,
      "",
      randomSeed,
      resolution.width,
      resolution.height,
      7,
      28,
      "Euler a",
      `${resolution.width} x ${resolution.height}`,
      "(None)",
      "Standard v3.1",
      false,
      0.55,
      1.5,
      true
    ],
    event_data: null,
    fn_index: 5,
    trigger_id: null,
    session_hash
  };

  const headers = {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/json"
  };

  const waitMsg = await message.reply("⏳ Generating image...");

  try {
    await axios.post("https://asahina2k-animagine-xl-3-1.hf.space/queue/join", payload, { headers });

    const res = await axios.get("https://asahina2k-animagine-xl-3-1.hf.space/queue/data", {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/event-stream", "Content-Type": "application/json" },
      params: { session_hash },
      timeout: 30000
    });

    const events = res.data.split("\n\n");
    let imageURL = null;

    for (const evt of events) {
      if (evt.startsWith("data:")) {
        try {
          const json = JSON.parse(evt.slice(5).trim());
          if (json.msg === "process_completed" && json.success) {
            imageURL = json.output?.data?.[0]?.[0]?.image?.url;
            break;
          }
        } catch {}
      }
    }

    if (!imageURL) return bot.editMessageText("⚠️ Image not ready yet. Try again later.", { chat_id: chatId, message_id: waitMsg.message_id });

    // Téléchargement et envoi de l'image
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const imgPath = path.join(cacheDir, `${session_hash}.png`);
    const imgRes = await axios.get(imageURL, { responseType: "stream" });
    await streamPipeline(imgRes.data, fs.createWriteStream(imgPath));

    await bot.editMessageText(`✅ Generated Image | Style: ${styleIndex} | Preset: ${presetIndex} | AR: ${aspectRatio}\nSeed: ${randomSeed}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });

    await bot.sendPhoto(chatId, fs.createReadStream(imgPath));

    fs.unlinkSync(imgPath);

  } catch (err) {
    console.error("Nijix CMD Error:", err.message);
    await bot.editMessageText(`❌ Failed to generate image: ${err.message}`, { chat_id: chatId, message_id: waitMsg.message_id });
  }
}

module.exports = { nix, onStart };
