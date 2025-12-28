const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

const API_BASE = "http://65.109.80.126:20409/aryan/yx";

const nix = {
  name: "youtube",
  version: "1.1",
  description: "Télécharger une vidéo ou audio YouTube",
  author: "Christus",
  prefix: false,
  category: "media",
  type: "anyone",
  cooldown: 5,
  guide: "{p}youtube -v <recherche|url>\n{p}youtube -a <recherche|url>"
};

async function downloadStream(url, filePath) {
  const res = await axios({ url, responseType: "stream" });
  const writer = fs.createWriteStream(filePath);
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function downloadYT(url, format) {
  const { data } = await axios.get(
    `${API_BASE}?url=${encodeURIComponent(url)}&type=${format}`
  );

  if (!data.status || !data.download_url) {
    throw new Error("API de téléchargement indisponible");
  }

  const filePath = path.join(__dirname, `yt_${Date.now()}.${format}`);
  await downloadStream(data.download_url, filePath);
  return filePath;
}

async function onStart({ bot, message, chatId, args }) {
  if (!args.length)
    return message.reply(
      "❌ Usage :\n/youtube -v <recherche|url>\n/youtube -a <recherche|url>"
    );

  const mode = args[0];
  if (!["-v", "-a"].includes(mode))
    return message.reply("❌ Mode invalide. Utilise -v (vidéo) ou -a (audio).");

  const query = args.slice(1).join(" ");
  if (!query)
    return message.reply("❌ Fournis une recherche ou une URL YouTube.");

  const waitMsg = await message.reply("⏳ Téléchargement en cours...");

  try {
    let ytUrl = query;

    if (!query.startsWith("http")) {
      const search = await ytSearch(query);
      if (!search.videos.length)
        throw new Error("Aucun résultat trouvé.");

      ytUrl = search.videos[0].url;
    }

    const format = mode === "-v" ? "mp4" : "mp3";
    const filePath = await downloadYT(ytUrl, format);

    await bot.editMessageText(
      `✅ Téléchargement terminé (${format.toUpperCase()})`,
      { chat_id: chatId, message_id: waitMsg.message_id }
    );

    if (format === "mp4") {
      await bot.sendVideo(chatId, fs.createReadStream(filePath), {
        supports_streaming: true
      });
    } else {
      await bot.sendAudio(chatId, fs.createReadStream(filePath));
    }

    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("YouTube CMD Error:", err.message);
    await bot.editMessageText(
      `❌ Erreur : ${err.message}`,
      { chat_id: chatId, message_id: waitMsg.message_id }
    );
  }
}

module.exports = { nix, onStart };
