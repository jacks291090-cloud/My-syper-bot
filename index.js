const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

const COINS = [
    { id: 'bitcoin', name: 'Bitcoin (BTC)' },
    { id: 'ethereum', name: 'Ethereum (ETH)' },
    { id: 'solana', name: 'Solana (SOL)' }
];

// Автоматичний аналіз ринку ШІ
async function analyzeMarket() {
    console.log("ШІ сканує ринок...");
    try {
        // Запит через відкритий шлюз, який не блокується хмарою Render
        const res = await fetch('https://coingecko.com');
        const data = await res.json();
        
        for (const coin of COINS) {
            if (data[coin.id]) {
                const price = data[coin.id].usd;
                const change = data[coin.id].usd_24h_change;

                let signal = null;
                // Якщо монета за добу впала більш ніж на 5% - це сигнал на покупку (дно)
                if (change < -5) signal = "BUY 🟢";
                // Якщо виросла більш ніж на 7% - сигнал на продаж (пік)
                else if (change > 7) signal = "SELL 🔴";

                if (signal && MY_CHAT_ID) {
                    const msg = `🚨 <b>ШІ СИГНАЛ: ${signal}</b>\n\n<b>Монета:</b> ${coin.name}\n<b>Ціна:</b> $${price.toFixed(2)}\n<b>Зміна за 24г:</b> ${change.toFixed(2)}%`;
                    await bot.telegram.sendMessage(MY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.error("Помилка аналізу:", e.message);
    }
}

// Виправлена і надійна команда /price
bot.command('price', async (ctx) => {
    try {
        const res = await fetch('https://coingecko.com');
        const data = await res.json();
        
        let msg = `💰 <b>Поточні ціни на ринку:</b>\n\n`;
        msg += `• <b>BTC:</b> $${data.bitcoin.usd.toFixed(2)}\n`;
        msg += `• <b>ETH:</b> $${data.ethereum.usd.toFixed(2)}\n`;
        msg += `• <b>SOL:</b> $${data.solana.usd.toFixed(2)}\n`;
        
        ctx.replyWithHTML(msg);
    } catch (e) {
        ctx.reply('Сервер оновлює дані, повтори команду через 10 секунд.');
    }
});

app.get('/', async (req, res) => {
    res.send('Розумний бот активний!');
    await analyzeMarket();
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер працює'));
bot.launch();
