const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

const CRYPTO_LIST = [
    { symbol: 'BTCUSDT', name: 'Bitcoin (BTC)' },
    { symbol: 'ETHUSDT', name: 'Ethereum (ETH)' },
    { symbol: 'SOLUSDT', name: 'Solana (SOL)' }
];

// 1. Функція розрахунку ковзної середньої (EMA)
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

// 2. Розрахунок стандартного RSI
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

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР ТРЕНДУ ТА ОБ'ЄМІВ
async function analyzeMarket() {
    console.log("[ШІ] Початок комплексного аналізу ринку (Тренд + Об'єми)...");
    
    for (const coin of CRYPTO_LIST) {
        try {
            // Завантажуємо 1-годинні свічки з Binance (ліміт 60 свічок для точної EMA)
            const response = await axios.get(`https://binance.com{coin.symbol}&interval=1h&limit=60`);
            const candles = response.data;

            const closePrices = candles.map(c => parseFloat(c[4])); // Ціни закриття (індекс 4)
            const volumes = candles.map(c => parseFloat(c[5]));     // Об'єми торгів (індекс 5)

            const currentPrice = closePrices[closePrices.length - 1];
            const currentVolume = volumes[volumes.length - 1];
            
            // Рахуємо середній об'єм за останні 10 годин для порівняння
            const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;

            // Розрахунок індикаторів тренду
            const ema20 = calculateEMA(closePrices, 20);
            const ema50 = calculateEMA(closePrices, 50);
            const rsi = calculateRSI(closePrices.slice(-14)); // RSI за 14 періодів

            let signal = null;
            let reason = "";

            // СУВОРИЙ АЛГОРИТМ УГОДИ
            if (currentPrice > ema20 && ema20 > ema50 && currentVolume > avgVolume * 1.2 && rsi > 45 && rsi < 65) {
                signal = "BUY";
                reason = `📈 <b>Підтверджено висхідний тренд!</b>\n` +
                         `• Ціна пробила ковзні середні вгору.\n` +
                         `• Об'єми торгів виросли на ${((currentVolume/avgVolume - 1) * 100).toFixed(0)}% (Зайшли гроші).\n` +
                         `• RSI рівний ${rsi.toFixed(0)} (Є запас для росту).`;
            } 
            else if (currentPrice < ema20 && ema20 < ema50 && currentVolume > avgVolume * 1.2 && rsi < 50) {
                signal = "SELL";
                reason = `📉 <b>Підтверджено спадний тренд (Шорт)!</b>\n` +
                         `• Ціна провалилася під лінію тренду EMA50.\n` +
                         `• Об'єми торгів виросли на ${((currentVolume/avgVolume - 1) * 100).toFixed(0)}%.\n` +
                         `• RSI рівний ${rsi.toFixed(0)}.`;
            }

            if (signal && MY_CHAT_ID) {
                const textMessage = `${signal === 'BUY' ? '🟢' : '🔴'} <b>ПРОФЕСІЙНИЙ СИГНАЛ: ${signal}</b>\n\n` +
                                    `<b>Актив:</b> ${coin.name}\n` +
                                    `<b>Ціна входу:</b> $${currentPrice}\n\n` +
                                    `📊 <b>Обґрунтування ШІ:</b>\n${reason}`;
                
                await bot.telegram.sendMessage(MY_CHAT_ID, textMessage, { parse_mode: 'HTML' })
                    .catch(err => console.error("Помилка надсилання в ТГ:", err.message));
            }

        } catch (error) {
            console.error(`Помилка ШІ для ${coin.symbol}:`, error.message);
        }
    }
}

// Ручна перевірка та запити від Cron-Job
app.get('/', async (req, res) => {
    res.send('Комплексний аналізатор тренду та об\'ємів працює!');
    await analyzeMarket();
});

// Кнопка миттєвої перевірки цін прямо в чаті
bot.command('price', async (ctx) => {
    try {
        const res = await axios.get('https://binance.com["BTCUSDT","ETHUSDT","SOLUSDT"]');
        let msg = `💰 <b>Поточні ціни на біржі:</b>\n\n`;
        res.data.forEach(coin => {
            msg += `• <b>${coin.symbol.replace('USDT', '')}:</b> $${parseFloat(coin.price).toFixed(2)}\n`;
        });
        ctx.replyWithHTML(msg);
    } catch (e) {
        ctx.reply('Не вдалося завантажити ціни.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Професійний сервер запущено`));

bot.start((ctx) => ctx.reply(`Бот активований. Твій Chat ID: ${ctx.chat.id}`));
bot.launch();
