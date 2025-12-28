const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

async function getAPIBase() {
  const { data } = await axios.get(API_CONFIG_URL);
  if (!data?.api) throw new Error("Missing api field");
  return data.api;
}

async function streamFromURL(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

async function downloadVideo(videoUrl, apiBase, message) {
  const { data } = await axios.get(`${apiBase}/xnxdl?url=${encodeURIComponent(videoUrl)}`);
  const fileUrl = data?.result?.files?.high || data?.result?.files?.low;
  if (!fileUrl) throw new Error("No file");

  const filePath = path.join(__dirname, `xnx_${Date.now()}.mp4`);
  const writer = fs.createWriteStream(filePath);

  const res = await axios({ url: fileUrl, responseType: "stream" });
  res.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  await message.reply({ attachment: fs.createReadStream(filePath) });
  fs.unlinkSync(filePath);
}

module.exports = {
  nix: {
    name: "xnx",
    aliases: ["xnxdl"],
    version: "1.0",
    author: "Christus",
    description: "Search and download XNX videos",
    category: "media",
    prefix: false,
    role: 0,
    countDown: 5,
  },

  onStart: async function ({ bot, message, args, chatId, msg }) {
    const query = args.join(" ");
    if (!query) return message.reply("❌ Please provide a search keyword.");

    let apiBase;
    try {
      apiBase = await getAPIBase();
    } catch (err) {
      return message.reply("❌ Failed to fetch API configuration.");
    }

    try {
      const res = await axios.get(`${apiBase}/xnx?q=${encodeURIComponent(query)}`);
      const results = res.data.result?.slice(0, 6);
      if (!results || results.length === 0) return message.reply("❌ No results found.");

      const thumbs = await Promise.all(
        results.filter(r => r.thumbnail).map(r => streamFromURL(r.thumbnail))
      );

      const body = results
        .map((v, i) => `• ${i + 1}. ${v.title}\n⏱ ${v.duration || "N/A"} | 👀 ${v.views || "N/A"}`)
        .join("\n\n") + "\n\nReply with a number (1–6) to download.";

      const sentMsg = await bot.sendMessage({ body, attachment: thumbs }, chatId);

      global.GoatBot.onReply.set(sentMsg.message_id, {
        commandName: "xnx",
        messageID: sentMsg.message_id,
        author: msg.senderID,
        results,
        apiBase,
      });

    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to search.");
    }
  },

  onReply: async function ({ bot, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return bot.sendMessage("❌ Invalid selection.", event.threadID);
    }

    const selected = Reply.results[choice - 1];
    await bot.unsendMessage(Reply.messageID);

    try {
      await downloadVideo(selected.link, Reply.apiBase, {
        reply: (msg) => bot.sendMessage(msg, event.threadID)
      });
    } catch (err) {
      console.error(err);
      bot.sendMessage("❌ Failed to download video.", event.threadID);
    }
  }
};
