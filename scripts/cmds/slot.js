const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "users.json");
const DAILY_LIMIT = 20;
const MAX_BET = 6000000;

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function formatMoney(amount) {
  if (isNaN(amount)) return "💲0";
  const scales = [
    { value: 1e15, suffix: "Q", emoji: "🌈" },
    { value: 1e12, suffix: "T", emoji: "✨" },
    { value: 1e9, suffix: "B", emoji: "💎" },
    { value: 1e6, suffix: "M", emoji: "💰" },
    { value: 1e3, suffix: "k", emoji: "💵" },
  ];
  for (const s of scales) {
    if (amount >= s.value) {
      return `${s.emoji}${(amount / s.value).toFixed(2)}${s.suffix}`;
    }
  }
  return `💲${amount.toLocaleString()}`;
}

function getBangladeshDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

const symbols = [
  { emoji: "🍒", weight: 30 },
  { emoji: "🍋", weight: 25 },
  { emoji: "🍇", weight: 20 },
  { emoji: "🍉", weight: 15 },
  { emoji: "⭐", weight: 7 },
  { emoji: "7️⃣", weight: 3 },
];

function rollSymbol() {
  const totalWeight = symbols.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const s of symbols) {
    if (r < s.weight) return s.emoji;
    r -= s.weight;
  }
  return symbols[0].emoji;
}

const nix = {
  name: "slots",
  version: "1.0.0",
  aliases: ["slot"],
  description: "🎰 Slot machine game with daily limits and jackpots.",
  author: "Christus",
  prefix: true,
  category: "game",
  cooldown: 8,
  guide: "{p}slots <mise>",
};

async function onStart({ bot, message, chatId, args }) {
  if (!args.length) {
    return message.reply(`❗ Usage: ${nix.guide.replace("{p}", "/")}`);
  }

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) {
    return message.reply("🔴 Erreur: Mise invalide ou manquante !");
  }
  if (bet > MAX_BET) {
    return message.reply(`🚫 Limite max: mise jusqu'à ${formatMoney(MAX_BET)} uniquement.`);
  }

  const data = loadData();

  // Correction ici pour récupérer userId en toute sécurité
  let userId;
  if (message.from && message.from.id) userId = message.from.id.toString();
  else if (message.sender && message.sender.id) userId = message.sender.id.toString();
  else userId = chatId.toString();

  if (!data[userId]) {
    data[userId] = { money: 1000000, slotsCount: 0, slotsDay: "" };
  }
  const user = data[userId];

  if (user.money < bet) {
    return message.reply(`🔴 Fonds insuffisants: il te manque ${formatMoney(bet - user.money)} !`);
  }

  const today = getBangladeshDate();
  if (user.slotsDay !== today) {
    user.slotsDay = today;
    user.slotsCount = 0;
  }

  if (user.slotsCount >= DAILY_LIMIT) {
    return message.reply(`⏳ Limite quotidienne atteinte: ${DAILY_LIMIT} parties max par jour (heure Bangladesh).`);
  }

  const waitMsg = await message.reply("⏳ 🎰 La machine à sous tourne...");

  const slot1 = rollSymbol();
  const slot2 = rollSymbol();
  const slot3 = rollSymbol();

  let winnings = 0;
  let outcome = "";
  let winType = "";
  let bonusText = "";

  if (slot1 === "7️⃣" && slot2 === "7️⃣" && slot3 === "7️⃣") {
    winnings = bet * 10;
    outcome = "🔥 MEGA JACKPOT! TRIPLE 7️⃣!";
    winType = "💎 MAX WIN";
    bonusText = "🎆 BONUS: +3% sur ton solde !";
    user.money = Math.floor(user.money * 1.03);
  } else if (slot1 === slot2 && slot2 === slot3) {
    winnings = bet * 5;
    outcome = "💰 JACKPOT! 3 symboles identiques!";
    winType = "💫 BIG WIN";
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    winnings = bet * 2;
    outcome = "✨ NICE! 2 symboles identiques!";
    winType = "🌟 WIN";
  } else if (Math.random() < 0.5) {
    winnings = Math.floor(bet * 1.5);
    outcome = "🎯 LUCKY SPIN! Bonus win!";
    winType = "🍀 SMALL WIN";
  } else {
    winnings = -bet;
    outcome = "💸 BETTER LUCK NEXT TIME!";
    winType = "☠️ LOSS";
  }

  user.money += winnings;
  user.slotsCount++;
  saveData(data);

  const slotBox =
    "╔═════════════════════╗\n" +
    "║  🎰 SLOT MACHINE 🎰  ║\n" +
    "╠═════════════════════╣\n" +
    `║     [ ${slot1} | ${slot2} | ${slot3} ]     ║\n` +
    "╚═════════════════════╝";

  const resultColor = winnings >= 0 ? "🟢" : "🔴";
  const resultMoney = winnings >= 0
    ? `🏆 WON: ${formatMoney(winnings)}`
    : `💸 LOST: ${formatMoney(bet)}`;

  const messageContent =
    `${slotBox}\n\n` +
    `🎯 RESULT: ${outcome}\n` +
    `${winType}\n` +
    `${bonusText}\n\n` +
    `${resultColor} ${resultMoney}\n` +
    `💰 BALANCE: ${formatMoney(user.money)}\n` +
    `🧮 SPINS TODAY: ${user.slotsCount}/${DAILY_LIMIT}`;

  try {
    await bot.editMessageText("📤 Envoi du résultat...", {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  } catch {}

  try {
    await bot.sendMessage(chatId, messageContent);
  } catch (e) {
    console.error("Erreur envoi message slots:", e.message);
  }

  try {
    await bot.deleteMessage(chatId, waitMsg.message_id);
  } catch {}
}

module.exports = { nix, onStart };
