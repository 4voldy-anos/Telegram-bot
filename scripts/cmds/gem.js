const axios = require("axios");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const API_URL = "https://gpt-1-m8mx.onrender.com/generate";

const ratioImages = {
  "9:16": "https://i.postimg.cc/Tw4YMpkq/Untitled4-20250828185218.jpg",
  "3:4": "https://i.postimg.cc/Dzz89kvh/Untitled5-20250828185241.jpg",
  "16:9": "https://i.postimg.cc/sfnyLQBM/Untitled9.jpg",
  L: "https://i.postimg.cc/jS1bSG6t/Untitled7-20250828185348.jpg",
  M: "https://i.postimg.cc/XJzFHNdt/Untitled8-20250828185413.jpg",
};

async function urlToBase64(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

function filterArtisticPrompt(prompt) {
  return prompt
    .replace(/\bnsfw\b/gi, "artistic figure study")
    .replace(/\bnude\b/gi, "artistic figure study")
    .replace(/\bnaked\b/gi, "unclothed figure study")
    .replace(/\berotic\b/gi, "artistic")
    .replace(/\bsensual\b/gi, "graceful");
}

module.exports = {
  nix: {
    name: "gem",
    aliases: ["gemi"],
    version: "1.0.1",
    author: "Kay • fixed by Christus",
    role: 0,
    description: "Generate artistic AI images",
    category: "ai",
    prefix: false,
    countDown: 5,
  },

  onStart: async function ({ message, args }) {
    if (!args.length) {
      return message.reply("🎨 | Please provide an artistic prompt.");
    }

    let promptParts = [];
    let ratio = null;
    let artisticMode = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--r" && args[i + 1]) {
        ratio = args[i + 1];
        i++;
      } else if (args[i] === "--nw") {
        artisticMode = true;
      } else {
        promptParts.push(args[i]);
      }
    }

    const rawPrompt = promptParts.join(" ");
    if (!rawPrompt) {
      return message.reply("🎨 | Please provide an artistic prompt.");
    }

    const processedPrompt = artisticMode
      ? filterArtisticPrompt(rawPrompt)
      : rawPrompt;

    let finalPrompt = artisticMode
      ? `You are creating a refined fine-art photograph.

SUBJECT:
${processedPrompt}

Focus on composition, lighting, and aesthetics.`
      : `Create a high-quality image:\n${processedPrompt}`;

    const images = [];

    if (ratio && ratioImages[ratio]) {
      images.push(await urlToBase64(ratioImages[ratio]));
    }

    // ✅ FIX ICI : reply image (NIX WAY)
    const replied = message.reply_to_message;
    if (replied?.photo) {
      for (const img of replied.photo.slice(0, 3)) {
        const res = await axios.get(img.file_id || img.file_unique_id, {
          responseType: "arraybuffer",
        });
        images.push(Buffer.from(res.data).toString("base64"));
      }
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    try {
      const { data } = await axios.post(
        API_URL,
        {
          prompt: finalPrompt,
          format: "jpg",
          ...(images.length ? { images } : {}),
        },
        { responseType: "arraybuffer", timeout: 180000 }
      );

      const filePath = path.join(cacheDir, `gem_${Date.now()}.jpg`);
      fs.writeFileSync(filePath, data);

      await message.reply({
        body: "🎨✨ Image generated successfully",
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("GEM ERROR:", err.message);
      return message.reply("❌ | Image generation failed.");
    }
  }
};
