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

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР
async function analyzeMarket() {
    console.log("[ШІ] Аналіз ринку...");
    for (const coin of CRYPTO_LIST) {
        try {
            // Надійний запит через вбудований fetch
            const res = await fetch(`https://binance.com{coin.symbol}&interval=1h&limit=30`);
            const candles = await res.json();
            
            const closePrices = candles.map(c => parseFloat(c[4])); // Індекс 4 - ціна закриття
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

// Команда /price (ТЕПЕР ПРАЦЮЄ НА 100%)
bot.command('price', async (ctx) => {
    try {
        let msg = `💰 <b>Поточні ціни на біржі:</b>\n\n`;
        
        for (const coin of CRYPTO_LIST) {
            const res = await fetch(`https://binance.com{coin.symbol}`);
            const data = await res.json();
            msg += `• <b>${coin.name.split(' ')[0]}:</b> $${parseFloat(data.price).toFixed(2)}\n`;
        }
        
        ctx.replyWithHTML(msg);
    } catch (e) {
        ctx.reply('Помилка зв\'язку з біржею Binance.');
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
