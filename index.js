const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Список монет для автоматичного аналізу ШІ
const CRYPTO_LIST = [
    { symbol: 'BTCUSDT', name: 'Bitcoin (BTC)' },
    { symbol: 'ETHUSDT', name: 'Ethereum (ETH)' },
    { symbol: 'SOLUSDT', name: 'Solana (SOL)' }
];

// Функція розрахунку індексу ринку (RSI)
function calculateRSI(candles) {
    const prices = candles.map(candle => parseFloat(candle[4])); // Зріз за ціною закриття
    let upMove = 0;
    let downMove = 0;
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i-1]) upMove += (prices[i] - prices[i-1]);
        else downMove += (prices[i-1] - prices[i]);
    }
    const rs = upMove / (downMove || 1);
    return 100 - (100 / (1 + rs));
}

// ГОЛОВНИЙ АЛГОРИТМ: Почерговий аналіз BTC, ETH, SOL
async function analyzeMarket() {
    console.log("[ШІ] Початок сканування криптовалютного ринку...");
    
    for (const coin of CRYPTO_LIST) {
        try {
            // 1. Аналіз 1-годинного таймфрейму (1h)
            const res1h = await axios.get(`https://binance.com{coin.symbol}&interval=1h&limit=20`);
            const rsi1h = calculateRSI(res1h.data);

            // 2. Аналіз 5-годинного таймфрейму (5h)
            const res5hRaw = await axios.get(`https://binance.com{coin.symbol}&interval=1h&limit=100`);
            const res5h = res5hRaw.data.filter((_, index) => index % 5 === 0);
            const rsi5h = calculateRSI(res5h);

            // Поточна ціна монети
            const currentPrice = parseFloat(res1h.data[res1h.data.length - 1][4]);

            let signal = null;
            let message = "";

            // ЛОГІКА СИГНАЛУ (Збіг 1h та 5h)
            if (rsi1h < 30 && rsi5h < 35) { 
                signal = "BUY";
                message = `🟢 <b>РОЗУМНИЙ СИГНАЛ: BUY (Лонг)</b> 🟢\n\n` +
                          `<b>Монета:</b> ${coin.name}\n` +
                          `<b>Поточна ціна:</b> $${currentPrice}\n\n` +
                          `📊 <b>Аналіз таймфреймів:</b>\n` +
                          `• Індекс 1 Година (1h): ${rsi1h.toFixed(2)} (Низький)\n` +
                          `• Індекс 5 Годин (5h): ${rsi5h.toFixed(2)} (Низький)\n\n` +
                          `🤖 <i>ШІ виявив сильну зону перепроданості на обох графіках. Рекомендовано покупку.</i>`;

            } else if (rsi1h > 70 && rsi5h > 65) { 
                signal = "SELL";
                message = `🔴 <b>РОЗУМНИЙ СИГНАЛ: SELL (Шорт)</b> 🔴\n\n` +
                          `<b>Монета:</b> ${coin.name}\n` +
                          `<b>Поточна ціна:</b> $${currentPrice}\n\n` +
                          `📊 <b>Аналіз таймфреймів:</b>\n` +
                          `• Індекс 1 Година (1h): ${rsi1h.toFixed(2)} (Високий)\n` +
                          `• Індекс 5 Годин (5h): ${rsi5h.toFixed(2)} (Високий)\n\n` +
                          `🤖 <i>ШІ зафіксував сильний перегрів ринку на обох графіках. Рекомендовано продаж.</i>`;
            }

            // Якщо є сигнал — надсилаємо його
            if (signal && MY_CHAT_ID) {
                await bot.telegram.sendMessage(MY_CHAT_ID, message, { parse_mode: 'HTML' });
                console.log(`[ШІ] Сигнал по ${coin.symbol} надіслано!`);
            } else {
                console.log(`[ШІ] ${coin.symbol} в межах норми. (1h: ${rsi1h.toFixed(1)}, 5h: ${rsi5h.toFixed(1)})`);
            }

        } catch (error) {
            console.error(`Помилка аналізу для ${coin.symbol}:`, error.message);
        }
    }
}

// Запит від Cron-Job кожні 5 хвилин
app.get('/', async (req, res) => {
    res.send('Мульти-монетний ШІ-аналізатор активний!');
    await analyzeMarket(); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Розумний сервер сигналів запущено на порті ${PORT}`));

bot.start((ctx) => ctx.reply(`Бот активований. Твій Chat ID: ${ctx.chat.id}`));
bot.launch();
