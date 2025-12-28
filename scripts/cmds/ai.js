const axios = require('axios');

const nix = {
  name: "ai",
  version: "2.0.0",
  description: "Chat with Christus AI and generate media using Christus API.",
  author: "Christus",
  prefix: false,
  category: "ai",
  type: "anyone",
  cooldown: 5,
  guide: "{p}ai <your message>",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply("❗ Please provide a message.\nUsage: {p}ai <text>");
  }

  const userText = args.join(" ");

  // Message de chargement
  const waitMsg = await message.reply("🤖 Thinking...");

  try {
    const apiUrl = `https://shizuai.vercel.app/chat`;
    const response = await axios.post(apiUrl, { uid: chatId, message: userText }, { timeout: 60000 });

    if (!response.data || !response.data.reply) {
      throw new Error("API returned an invalid response.");
    }

    let aiReply = response.data.reply;

    // Remplacer les mentions Shizu/Heck par Christus
    aiReply = aiReply
      .replace(/Heck\.ai/gi, "Christus")
      .replace(/Aryan/gi, "Christus")
      .replace(/🎀\s*𝗦𝗵𝗶𝘇𝘂/gi, "🗿 𝐂𝐇𝐑𝐈𝐒𝐓𝐔𝐒")
      .replace(/Shizu AI|Shizuka AI|Shizuka|Shizu/gi, "Christus AI")
      .replace(
        /Je suis Shizuka AI, un assistant intelligent, poli et utile créé par Christus\./gi,
        "Je suis Christus AI, un assistant intelligent, poli et utile créé par Christus."
      );

    await bot.editMessageText(`💬 *AI Response:*\n${aiReply}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error("AI Command Error:", err.message);

    await bot.editMessageText(`⚠️ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
}

module.exports = { nix, onStart };
