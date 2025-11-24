const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

const nix = {
  name: "sing",
  version: "1.0.0",
  aliases: ["music", "song"],
  description: "Search and download music from YouTube",
  author: "Christus",
  prefix: false,
  category: "music",
  type: "anyone",
  cooldown: 5,
  guide: "{p}sing <song name or YouTube URL>",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply("❌ Provide a song name or YouTube URL.");
  }

  const query = args.join(" ");

  // Message temporaire
  const waitMsg = await message.reply("🎵 Patience... je cherche le son 🔍");

  try {
    let videoURL;

    // Si c’est déjà une URL YouTube
    if (query.startsWith("http")) {
      videoURL = query;
    } else {
      // Recherche YouTube
      const search = await ytSearch(query);
      if (!search || !search.videos.length) throw new Error("No results found.");
      videoURL = search.videos[0].url;
    }

    // API externe
    const apiURL = `http://65.109.80.126:20409/aryan/play?url=${encodeURIComponent(videoURL)}`;
    const res = await axios.get(apiURL);
    const data = res.data;

    if (!data.status || !data.downloadUrl) {
      throw new Error("API error: no download URL.");
    }

    const title = data.title.replace(/[\\/:"*?<>|]/g, "");
    const fileName = `${title}.mp3`;
    const filePath = path.join(__dirname, fileName);

    // Téléchargement du MP3
    const audioFile = await axios.get(data.downloadUrl, {
      responseType: "arraybuffer",
    });

    fs.writeFileSync(filePath, audioFile.data);

    // Envoi sur Telegram
    await bot.sendAudio(
      chatId,
      filePath,
      {
        caption: `🎵 *MUSIC*\n━━━━━━━━━━━━━━━\n${title}`,
        parse_mode: "Markdown"
      }
    );

    fs.unlinkSync(filePath); // Suppression fichier temporaire
    await bot.deleteMessage(chatId, waitMsg.message_id);

  } catch (err) {
    console.error(err);

    await bot.editMessageText(
      `❌ Failed to download song: ${err.message}`,
      { chat_id: chatId, message_id: waitMsg.message_id }
    );
  }
}

module.exports = { nix, onStart };
