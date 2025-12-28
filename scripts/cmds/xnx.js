const axios = require("axios");

const nix = {
  name: "xnx",
  aliases: ["xnxx", "pornsearch"],
  version: "1.0",
  author: "Christus",
  description: "Search and send adult videos from XNX API",
  prefix: false,
  category: "nsfw",
  type: "anyone",
  cooldown: 5,
  guide: "{p}xnx <keyword>"
};

const API_CONFIG = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

async function getStream(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) return message.reply("⚠️ Please provide a keyword.");

  const waitMsg = await message.reply("⏳ Searching videos...");

  try {
    const { data: configData } = await axios.get(API_CONFIG);
    const base = configData?.api;
    if (!base) throw new Error("Failed to fetch API config.");

    const query = args.join(" ");
    const res = await axios.get(`${base}/xnx?q=${encodeURIComponent(query)}`);
    const results = res.data.result;

    if (!results || results.length === 0) {
      await bot.editMessageText("❌ No results found.", { chat_id: chatId, message_id: waitMsg.message_id });
      return;
    }

    const limitedResults = results.slice(0, 6);
    let msg = "";
    for (let i = 0; i < limitedResults.length; i++) {
      const v = limitedResults[i];
      msg += `${i + 1}. ${v.title}\n⏱ ${v.duration || "N/A"} | 👀 ${v.views || "N/A"}\n\n`;
    }

    await bot.editMessageText(msg + "Reply with number (1-6) to download video", { chat_id: chatId, message_id: waitMsg.message_id });

    global.GoatBot.onReply.set(waitMsg.message_id, {
      results: limitedResults,
      author: message.senderID,
      messageID: waitMsg.message_id,
      base
    });

  } catch (err) {
    console.error("XNX Search Error:", err.message || err);
    await bot.editMessageText("❌ Failed to search videos.", { chat_id: chatId, message_id: waitMsg.message_id });
  }
}

async function onReply({ bot, event, Reply }) {
  const { results, author, messageID, base, chatId } = Reply;
  if (event.senderID !== author) return;

  const choice = parseInt(event.body);
  if (isNaN(choice) || choice < 1 || choice > results.length) {
    return bot.sendMessage(chatId, "❌ Invalid selection.", event.messageID);
  }

  const selected = results[choice - 1];
  await bot.unsendMessage(messageID);
  const waitMsg = await bot.sendMessage(chatId, "⏳ Downloading video...");

  try {
    const dlRes = await axios.get(`${base}/xnxdl?url=${encodeURIComponent(selected.link)}`);
    const data = dlRes.data.result;
    const videoUrl = data.files.high || data.files.low;
    if (!videoUrl) throw new Error("No video URL returned");

    await bot.sendVideo(chatId, videoUrl, {
      caption: `• Title: ${data.title}\n• Duration: ${data.duration || "N/A"}\n• Views: ${data.info || "N/A"}`
    });

    await bot.unsendMessage(waitMsg.message_id);

  } catch (err) {
    console.error("XNX Download Error:", err.message || err);
    await bot.editMessageText("❌ Failed to download video.", { chat_id: chatId, message_id: waitMsg.message_id });
  }
}

module.exports = { nix, onStart, onReply };
