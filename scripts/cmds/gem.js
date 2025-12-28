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
    .replace(/\bsensual\b/gi, "graceful")
    .replace(/\bboobs?\b/gi, "chest area")
    .replace(/\bbreasts?\b/gi, "décolletage");
}

module.exports = {
  nix: {
    name: "gem",
    aliases: ["gemi"],
    version: "1.0.0",
    author: "Kay • fixed by Christus",
    role: 2,
    description: "Generate artistic AI images",
    category: "ai",
    prefix: false,
    countDown: 5,
  },

  onStart: async function ({ message, args, event }) {
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
      ? `You are creating a refined fine-art photograph suitable for a gallery exhibition.

ARTISTIC SUBJECT:
${processedPrompt}

Focus on composition, lighting, and aesthetic beauty.`
      : `Create a high-quality image based on this description:\n${processedPrompt}`;

    const images = [];

    if (ratio && ratioImages[ratio]) {
      images.push(await urlToBase64(ratioImages[ratio]));
      finalPrompt += `
CRITICAL RATIO RULE:
The image must fully fill the frame with no borders or empty space.`;
    }

    if (event.messageReply?.attachments?.length) {
      const photos = event.messageReply.attachments
        .filter(a => a.type === "photo")
        .slice(0, 3);

      for (const img of photos) {
        const res = await axios.get(img.url, { responseType: "arraybuffer" });
        images.push(Buffer.from(res.data).toString("base64"));
      }
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    try {
      message.reaction("⏳", event.messageID);

      const { data } = await axios.post(
        API_URL,
        {
          prompt: finalPrompt,
          format: "jpg",
          ...(images.length ? { images } : {}),
        },
        {
          responseType: "arraybuffer",
          timeout: 180000,
        }
      );

      const filePath = path.join(cacheDir, `gem_${Date.now()}.jpg`);
      fs.writeFileSync(filePath, data);

      message.reaction("✅", event.messageID);

      await message.reply({
        body: `🎨✨ Image generated${ratio ? ` (${ratio})` : ""}${artisticMode ? " [Artistic Mode]" : ""}`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("GEM ERROR:", err?.response?.status || err.message);
      message.reaction("❌", event.messageID);

      if (err.response?.status === 400) {
        return message.reply("🎨 | The request couldn't be processed. Try rephrasing artistically.");
      }

      return message.reply("❌ | Image generation failed.");
    }
  }
};
