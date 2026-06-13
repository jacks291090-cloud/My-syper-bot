const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Універсальний математичний розрахунок індексу RSI
function calculateRSI(prices) {
    let upMove = 0; let downMove = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i-1]) upMove += (prices[i] - prices[i-1]);
        else downMove += (prices[i-1] - prices[i]);
    }
    const rs = upMove / (downMove || 1);
    return 100 - (100 / (1 + rs));
}

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР (Працює через резервне незаблоковане джерело)
async function analyzeMarket() {
    console.log("[ШІ] Комплексний аналіз ринку...");
    const coins = ['BTC', 'ETH', 'SOL'];
    
    for (const coin of coins) {
        try {
            // Запит до відкритого європейського проксі-дзеркала котирувань
            const res = await fetch(`https://coingecko.com{coin === 'BTC' ? 'bitcoin' : coin === 'ETH' ? 'ethereum' : 'solana'}/market_data`);
            const data = await res.json();
            if (!data || !data.market_data) continue;

            const currentPrice = data.market_data.current_price.usd;
            
            // Робимо симуляцію RSI на базі добових змін для стабільності
            const change24h = data.market_data.price_change_percentage_24h;
            let simulatedRsi = 50 + (change24h * 2); 
            if (simulatedRsi > 100) simulatedRsi = 95;
            if (simulatedRsi < 0) simulatedRsi = 5;

            let signal = null;
            if (simulatedRsi < 30) signal = "BUY 🟢";
            else if (simulatedRsi > 70) signal = "SELL 🔴";

            if (signal && MY_CHAT_ID) {
                const msg = `🚨 <b>ШІ СИГНАЛ: ${signal}</b>\n\n<b>Монета:</b> ${coin}/USDT\n<b>Ціна:</b> $${currentPrice.toFixed(2)}\n<b>RSI (Simulated):</b> ${simulatedRsi.toFixed(0)}`;
                await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            }
        } catch (e) {
            console.error("Помилка ШІ:", e.message);
        }
    }
}

// Команда /price (ТЕПЕР ПРАЦЮЄ ЧЕРЕЗ СТАБІЛЬНИЙ КУРС)
bot.command('price', async (ctx) => {
    try {
        let msg = `💰 <b>Поточні ціни на ринку (CoinGecko):</b>\n\n`;
        
        // Отримуємо дані одним легким запитом, який дозволений на Render
        const res = await fetch('https://coingecko.com');
        const data = await res.json();
        
        if (data.bitcoin && data.ethereum && data.solana) {
            msg += `• <b>Bitcoin (BTC):</b> $${data.bitcoin.usd.toFixed(2)}\n`;
            msg += `• <b>Ethereum (ETH):</b> $${data.ethereum.usd.toFixed(2)}\n`;
            msg += `• <b>Solana (SOL):</b> $${data.solana.usd.toFixed(2)}\n`;
            ctx.replyWithHTML(msg);
        } else {
            ctx.reply('Помилка обробки котирувань.');
        }
    } catch (e) {
        console.error(e.message);
        ctx.reply('Сервер оновлює дані. Спробуйте ще раз через 30 секунд.');
    }
});

app.get('/', async (req, res) => {
    res.send('Аналізатор активований через захищені канали!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює'));
bot.launch();
