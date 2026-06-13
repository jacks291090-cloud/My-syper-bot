const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Розширений список криптовалют
const CRYPTO_LIST = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', ticker: 'BTC' },
    { symbol: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH' },
    { symbol: 'SOLUSDT', name: 'Solana', ticker: 'SOL' },
    { symbol: 'BNBUSDT', name: 'BNB', ticker: 'BNB' },
    { symbol: 'XRPUSDT', name: 'Ripple', ticker: 'XRP' },
    { symbol: 'ADAUSDT', name: 'Cardano', ticker: 'ADA' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', ticker: 'DOGE' }
];

// Універсальна функція для розрахунку RSI
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

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР (Працює через проксі)
async function analyzeMarket() {
    console.log("[ШІ] Комплексний аналіз розширеного ринку...");
    
    for (const coin of CRYPTO_LIST) {
        try {
            // Використовуємо проксі для завантаження годинних свічок (ліміт 30)
            const res = await fetch(`https://allorigins.win{encodeURIComponent(`https://cryptocompare.com{coin.ticker}&tsym=USDT&limit=30`)}`);
            const proxyData = await res.json();
            const json = JSON.parse(proxyData.contents);
            
            if (!json.Data || !json.Data.Data) continue;
            
            const closePrices = json.Data.Data.map(c => c.close);
            const currentPrice = closePrices[closePrices.length - 1];
            const rsi = calculateRSI(closePrices.slice(-14));

            let signal = null;
            if (rsi < 30) signal = "BUY 🟢";
            else if (rsi > 70) signal = "SELL 🔴";

            if (signal && MY_CHAT_ID) {
                const msg = `🚨 <b>ШІ СИГНАЛ: ${signal}</b>\n\n<b>Монета:</b> ${coin.name} (${coin.ticker}/USDT)\n<b>Ціна:</b> $${currentPrice}\n<b>RSI:</b> ${rsi.toFixed(0)}`;
                await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error(`Помилка ШІ для ${coin.ticker}:`, e.message);
        }
    }
}

// Команда /price (Опитування всіх 7 монет через проксі)
bot.command('price', async (ctx) => {
    try {
        let msg = `💰 <b>Поточні ціни на ринку (Bybit):</b>\n\n`;
        
        for (const coin of CRYPTO_LIST) {
            const res = await fetch(`https://allorigins.win{encodeURIComponent(`https://bybit.com{coin.symbol}`)}`);
            const proxyData = await res.json();
            const data = JSON.parse(proxyData.contents);
            
            if (data.result && data.result.list && data.result.list[0]) {
                const price = parseFloat(data.result.list[0].lastPrice);
                // Гарне форматування: для дешевих монет типу DOGE чи ADA залишаємо більше знаків після коми
                const formattedPrice = price < 5 ? price.toFixed(4) : price.toFixed(2);
                msg += `• <b>${coin.name} (${coin.ticker}):</b> $${formattedPrice}\n`;
            }
        }
        
        ctx.replyWithHTML(msg);
    } catch (e) {
        console.error(e.message);
        ctx.reply('Помилка оновлення розширеного списку цін.');
    }
});

app.get('/', async (req, res) => {
    res.send('Розширений аналізатор активний!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований з новими монетами! Твій Chat ID: ${ctx.chat.id}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює з розширеним списком'));
bot.launch();
