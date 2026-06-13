const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

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

// ГОЛОВНИЙ ШІ-АНАЛІЗАТОР (Працює через стабільне CryptoCompare API)
async function analyzeMarket() {
    console.log("[ШІ] Комплексний аналіз ринку...");
    const coins = ['BTC', 'ETH', 'SOL'];
    
    for (const coin of coins) {
        try {
            // Отримуємо годинні свічки (ліміт 30) через відкрите API, яке не блокує Render
            const res = await fetch(`https://cryptocompare.com{coin}&tsym=USDT&limit=30`);
            const json = await res.json();
            
            if (!json.Data || !json.Data.Data) continue;
            
            const closePrices = json.Data.Data.map(c => c.close);
            const currentPrice = closePrices[closePrices.length - 1];
            const rsi = calculateRSI(closePrices.slice(-14));

            let signal = null;
            if (rsi < 30) signal = "BUY 🟢";
            else if (rsi > 70) signal = "SELL 🔴";

            if (signal && MY_CHAT_ID) {
                const msg = `🚨 <b>ШІ СИГНАЛ: ${signal}</b>\n\n<b>Монета:</b> ${coin}/USDT\n<b>Ціна:</b> $${currentPrice}\n<b>RSI:</b> ${rsi.toFixed(0)}`;
                await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error("Помилка ШІ:", e.message);
        }
    }
}

// Команда /price (ТЕПЕР ПРАЦЮЄ ЧЕРЕЗ НЕБЛОКОВАНЕ API)
bot.command('price', async (ctx) => {
    try {
        let msg = `💰 <b>Поточні ціни на ринку:</b>\n\n`;
        
        // Отримуємо ціни для трьох монет одним швидким запитом
        const res = await fetch('https://cryptocompare.com');
        const data = await res.json();
        
        if (data.BTC && data.ETH && data.SOL) {
            msg += `• <b>Bitcoin (BTC):</b> $${data.BTC.USDT.toFixed(2)}\n`;
            msg += `• <b>Ethereum (ETH):</b> $${data.ETH.USDT.toFixed(2)}\n`;
            msg += `• <b>Solana (SOL):</b> $${data.SOL.USDT.toFixed(2)}\n`;
            ctx.replyWithHTML(msg);
        } else {
            ctx.reply('Помилка обробки даних з сервера цін.');
        }
    } catch (e) {
        console.error(e.message);
        ctx.reply('Помилка зв\'язку з сервером котирувань.');
    }
});

app.get('/', async (req, res) => {
    res.send('Аналізатор активний та захищений від блокувань!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює'));
bot.launch();
