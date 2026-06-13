const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
app.use(express.json()); // Дозволяє боту читати дані від TradingView

const MY_CHAT_ID = process.env.MY_CHAT_ID;
const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Ця адреса чекає на автоматичні сигнали від твоїх графіків
app.post('/webhook-signal', (req, res) => {
    const data = req.body;
    console.log("Отримано сигнал з TradingView:", data);

    let message = `🚨 <b>СИГНАЛ З TRADINGVIEW</b> 🚨\n\n`;

    // Форматування повідомлення: якщо ти надіслав готовий текст
    if (data.text) {
        message += `${data.text}`;
    } else {
        // Якщо надіслав структуровані дані
        message += `<b>Актив:</b> ${data.ticker || 'Крипта'}\n`;
        message += `<b>Дія:</b> ${data.action === 'buy' ? '🟢 BUY (Лонг)' : '🔴 SELL (Шорт)'}\n`;
        message += `<b>Ціна:</b> $${data.price || 'за ринком'}`;
    }

    // Надсилаємо сигнал тобі в особисті повідомлення Telegram
    if (MY_CHAT_ID) {
        bot.telegram.sendMessage(MY_CHAT_ID, message, { parse_mode: 'HTML' })
            .catch(err => console.error("Помилка відправки:", err.message));
    }

    return res.status(200).send('OK');
});

// Головна сторінка для перевірки сервісу
app.get('/', (req, res) => {
    res.send('Приймач сигналів з TradingView повністю активний!');
});

bot.start((ctx) => ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}`));
bot.launch();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущено`));
