const ytSearch = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://65.109.80.126:20409/aryan/yx";
const sessions = new Map();

async function fetchStream(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

async function downloadYT(url, format, bot, message, chatId, replyTo) {
  try {
    const { data } = await axios.get(
      `${API_BASE}?url=${encodeURIComponent(url)}&type=${format}`
    );

    if (!data.status || !data.download_url)
      throw new Error("API failed");

    const filePath = path.join(__dirname, `yt_${Date.now()}.${format}`);
    const writer = fs.createWriteStream(filePath);

    const stream = await axios({
      url: data.download_url,
      responseType: "stream"
    });

    stream.data.pipe(writer);

    await new Promise((res, rej) => {
      writer.on("finish", res);
      writer.on("error", rej);
    });

    await message.reply({
      attachment: fs.createReadStream(filePath),
      reply_to_message_id: replyTo
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`${format} error:`, err.message);
    message.reply({ body: `❌ Échec du téléchargement (${format}).` });
  }
}

module.exports = {
  nix: {
    name: "youtube",
    aliases: ["ytb"],
    version: "0.0.9",
    role: 0,
    author: "Christus",
    description: "Rechercher et télécharger une vidéo ou audio YouTube",
    category: "media",
    prefix: true
  },

  onStart: async function ({ bot, message, msg, chatId, args }) {
    const mode = args[0];
    if (!["-v", "-a"].includes(mode))
      return message.reply({
        body: "❌ Utilisation : /ytb -v <recherche|url>\n/ytb -a <recherche|url>"
      });

    const query = args.slice(1).join(" ");
    if (!query)
      return message.reply({ body: "❌ Fournissez une recherche ou une URL." });

    // 🔗 URL directe
    if (query.startsWith("http")) {
      return downloadYT(
        query,
        mode === "-v" ? "mp4" : "mp3",
        bot,
        message,
        chatId,
        msg.message_id
      );
    }

    try {
      const results = await ytSearch(query);
      const videos = results.videos.slice(0, 6);

      if (!videos.length)
        return message.reply({ body: "❌ Aucun résultat trouvé." });

      let body = "📥 Résultats YouTube :\n\n";
      videos.forEach((v, i) => {
        body += `${i + 1}. ${v.title}\n`;
      });

      const thumbs = await Promise.all(
        videos.map(v => fetchStream(v.thumbnail))
      );

      const sent = await message.reply({
        body: body + "\nRépondez avec un numéro (1-6)",
        attachment: thumbs
      });

      sessions.set(sent.message_id, {
        author: msg.from.id,
        videos,
        type: mode
      });
    } catch (err) {
      console.error(err);
      message.reply({ body: "❌ Erreur lors de la recherche YouTube." });
    }
  },

  onMessage: async function ({ bot, message, msg, chatId }) {
    const reply = msg.reply_to_message;
    if (!reply) return;

    const session = sessions.get(reply.message_id);
    if (!session) return;
    if (msg.from.id !== session.author) return;

    const choice = parseInt(msg.text);
    if (
      isNaN(choice) ||
      choice < 1 ||
      choice > session.videos.length
    ) {
      return message.reply({
        body: "❌ Numéro invalide (1-6)."
      });
    }

    const video = session.videos[choice - 1];
    sessions.delete(reply.message_id);

    await bot.deleteMessage(chatId, reply.message_id);

    downloadYT(
      video.url,
      session.type === "-v" ? "mp4" : "mp3",
      bot,
      message,
      chatId,
      msg.message_id
    );
  }
};
