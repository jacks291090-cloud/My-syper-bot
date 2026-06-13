const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

const CRYPTO_LIST = [
    { symbol: 'BTCUSDT', name: 'Bitcoin (BTC)' },
    { symbol: 'ETHUSDT', name: 'Ethereum (ETH)' },
    { symbol: 'SOLUSDT', name: 'Solana (SOL)' }
];

// Проста математична функція для розрахунку RSI
function calculateRSI(prices) {
    let upMove = 0;
    let downMove = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i-1]) upMove += (prices[i] - prices[i-1]);
        else downMove += (prices[i-1] - prices[i]);
    }
    const rs = upMove / (downMove || 1);
    return 100 - (100 / (1 + rs));
}

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР (Працює через Bybit API)
async function analyzeMarket() {
    console.log("[ШІ] Аналіз ринку...");
    for (const coin of CRYPTO_LIST) {
        try {
            // Запит свічок з Bybit (вони не блокують Render)
            const res = await fetch(`https://bybit.com{coin.symbol}&interval=60&limit=30`);
            const json = await res.json();
            
            if (!json.result || !json.result.list) continue;
            
            // Bybit віддає свічки від нових до старих, тому беремо індекс 4 (close) і робимо reverse
            const closePrices = json.result.list.map(c => parseFloat(c[4])).reverse();
            const currentPrice = closePrices[closePrices.length - 1];
            const rsi = calculateRSI(closePrices.slice(-14));

            let signal = null;
            if (rsi < 30) signal = "BUY 🟢";
            else if (rsi > 70) signal = "SELL 🔴";

            if (signal && MY_CHAT_ID) {
                const msg = `🚨 <b>ШІ СИГНАЛ: ${signal}</b>\n\n<b>Монета:</b> ${coin.name}\n<b>Ціна:</b> $${currentPrice}\n<b>RSI:</b> ${rsi.toFixed(0)}`;
                await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error("Помилка ШІ:", e.message);
        }
    }
}

// Команда /price (ТЕПЕР НАЙНАДІЙНІША ЧЕРЕЗ BYBIT)
bot.command('price', async (ctx) => {
    try {
        let msg = `💰 <b>Поточні ціни на біржі (Bybit):</b>\n\n`;
        
        for (const coin of CRYPTO_LIST) {
            const res = await fetch(`https://bybit.com{coin.symbol}`);
            const json = await res.json();
            
            if (json.result && json.result.list && json.result.list[0]) {
                const price = parseFloat(json.result.list[0].lastPrice).toFixed(2);
                msg += `• <b>${coin.name}:</b> $${price}\n`;
            }
        }
        
        ctx.replyWithHTML(msg);
    } catch (e) {
        ctx.reply('Помилка зв\'язку з торговою платформою.');
    }
});

app.get('/', async (req, res) => {
    res.send('Аналізатор активний!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює'));
bot.launch();
