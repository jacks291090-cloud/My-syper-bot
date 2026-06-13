const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

const CRYPTO_LIST = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', ticker: 'BTC' },
    { symbol: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH' },
    { symbol: 'SOLUSDT', name: 'Solana', ticker: 'SOL' },
    { symbol: 'BNBUSDT', name: 'BNB', ticker: 'BNB' },
    { symbol: 'XRPUSDT', name: 'Ripple', ticker: 'XRP' },
    { symbol: 'ADAUSDT', name: 'Cardano', ticker: 'ADA' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', ticker: 'DOGE' },
    { symbol: 'DOTUSDT', name: 'Polkadot', ticker: 'DOT' },
    { symbol: 'LINKUSDT', name: 'Chainlink', ticker: 'LINK' },
    { symbol: 'MATICUSDT', name: 'Polygon', ticker: 'MATIC' },
    { symbol: 'AVAXUSDT', name: 'Avalanche', ticker: 'AVAX' },
    { symbol: 'LTCUSDT', name: 'Litecoin', ticker: 'LTC' },
    { symbol: 'ATOMUSDT', name: 'Cosmos', ticker: 'ATOM' },
    { symbol: 'UNIUSDT', name: 'Uniswap', ticker: 'UNI' },
    { symbol: 'NEARUSDT', name: 'Near', ticker: 'NEAR' },
    { symbol: 'FTMUSDT', name: 'Fantom', ticker: 'FTM' },
    { symbol: 'APTUSDT', name: 'Aptos', ticker: 'APT' },
    { symbol: 'SUIUSDT', name: 'Sui', ticker: 'SUI' },
    { symbol: 'PEPEUSDT', name: 'Pepe', ticker: 'PEPE' },
    { symbol: 'SHIBUSDT', name: 'Shiba Inu', ticker: 'SHIB' }
];

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

function calculateRSI(prices) {
    let upMove = 0; let downMove = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i-1]) upMove += (prices[i] - prices[i-1]);
        else downMove += (prices[i-1] - prices[i]);
    }
    const rs = upMove / (downMove || 1);
    return 100 - (100 / (1 + rs));
}

async function analyzeMarket() {
    console.log("[ШІ] Аналіз ринку тренду та об'ємів...");
    for (const coin of CRYPTO_LIST) {
        try {
            // Запит годинних свічок через стабільне дзеркало Bybit (без блокувань)
            const res = await fetch(`https://bybit.com{coin.symbol}&interval=60&limit=60`);
            const json = await res.json();
            if (!json.result || !json.result.list) continue;

            // Bybit віддає від нових до старих, розвертаємо масив
            const candles = json.result.list.reverse();
            const closePrices = candles.map(c => parseFloat(c[4]));
            const volumes = candles.map(c => parseFloat(c[5]));

            const currentPrice = closePrices[closePrices.length - 1];
            const currentVolume = volumes[volumes.length - 1];
            const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;

            const ema20 = calculateEMA(closePrices, 20);
            const ema50 = calculateEMA(closePrices, 50);
            const rsi = calculateRSI(closePrices.slice(-14));

            let signal = null;
            let reason = "";

            if (currentPrice > ema20 && ema20 > ema50 && currentVolume > avgVolume * 1.2 && rsi > 45 && rsi < 65) {
                signal = "BUY 🟢";
                reason = `• Ціна вище трендових ліній EMA.\n• Об'єми торгів виросли на ${((currentVolume/avgVolume - 1) * 100).toFixed(0)}% (Зайшов крупний гравець).\n• RSI: ${rsi.toFixed(0)} (Є запас для росту).`;
            } else if (currentPrice < ema20 && ema20 < ema50 && currentVolume > avgVolume * 1.2 && rsi < 50) {
                signal = "SELL 🔴";
                reason = `• Ціна пробила лінії підтримки вниз.\n• Об'єми на продаж виросли на ${((currentVolume/avgVolume - 1) * 100).toFixed(0)}%.\n• RSI: ${rsi.toFixed(0)} (Ведмежий тренд).`;
            }

            if (signal && MY_CHAT_ID) {
                let formattedPrice = currentPrice < 1 ? currentPrice.toFixed(5) : currentPrice.toFixed(2);
                const msg = `🚨 <b>ПРОФЕСІЙНИЙ ШІ СИГНАЛ: ${signal}</b>\n\n<b>Актив:</b> ${coin.name} (${coin.ticker}/USDT)\n<b>Ціна входу:</b> $${formattedPrice}\n\n<b>Обґрунтування алгоритму:</b>\n${reason}`;
                await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
            console.error(e.message);
        }
    }
}

bot.command('price', async (ctx) => {
    try {
        let msg1 = `💰 <b>Поточні ціни на ринку (Частина 1):</b>\n\n`;
        let msg2 = `💰 <b>Поточні ціни на ринку (Частина 2):</b>\n\n`;
        let counter = 0;

        for (const coin of CRYPTO_LIST) {
            const res = await fetch(`https://bybit.com{coin.symbol}`);
            const json = await res.json();
            
            if (json.result && json.result.list) {
                const price = parseFloat(json.result.list[0].lastPrice);
                let formattedPrice = price < 0.0001 ? price.toFixed(8) : (price < 1 ? price.toFixed(5) : price.toFixed(2));
                const line = `• <b>${coin.ticker}:</b> $${formattedPrice}\n`;
                
                if (counter < 10) msg1 += line; else msg2 += line;
                counter++;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await ctx.replyWithHTML(msg1);
        await ctx.replyWithHTML(msg2);
    } catch (e) {
        ctx.reply('Помилка завантаження списку цін.');
    }
});

app.get('/', async (req, res) => {
    res.send('Ультралегкий аналізатор Топ-20 активний!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює'));
bot.launch();
