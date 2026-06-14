const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const axios = require('axios');
const http = require('http'); // Додаємо стандартний веб-сервер Node.js

const botToken = process.env.TELEGRAM_TOKEN;
const userId = "1994869835"; 

if (!botToken) {
    console.error("Токен не знайдено!");
    process.exit(1);
}

const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply('🤖 Бот активований! Авто-сигнали на 3хв, 1г та 5г запущені. Напиши /price для перевірки курсу.'));

bot.command('price', async (ctx) => {
    try {
        const res = await axios.get('https://coingecko.com');
        const currentPrice = res.data.bitcoin.usd;
        await ctx.reply(`💰 Поточна ціна BTC/USDT: $${currentPrice}`);
    } catch (err) {
        console.error("Помилка команди:", err.message);
        await ctx.reply("❌ Помилка зв'язку з сервером ціни. Спробуйте ще раз.");
    }
});

async function sendAutoSignal(timeframeName) {
    try {
        const res = await axios.get('https://coingecko.com');
        const data = res.data[0]; // Виправлено отримання масиву від CoinGecko
        
        const price = data.current_price;
        const percent = parseFloat(data.price_change_percentage_24h).toFixed(2);

        let signalType = "⏳ ОЧІКУВАННЯ (ФЛЕТ)";
        let icon = "⚪";

        if (percent > 1.0) { signalType = "📈 ПОКУПКА (BUY)"; icon = "🟢"; }
        else if (percent < -1.0) { signalType = "📉 ПРОДАЖ (SELL)"; icon = "🔴"; }

        const msg = `${icon} **[АВТО-СИГНАЛ: BTC/USDT | ТФ: ${timeframeName}]**\n\n` +
                    `💵 **Ціна:** $${price}\n` +
                    `📊 **Зміна за 24г:** ${percent}%\n\n` +
                    `🤖 **Рішення:** ${signalType}`;

        await bot.telegram.sendMessage(userId, msg, { parse_mode: "Markdown" });
        console.log(`[${timeframeName}] Сигнал успішно надіслано.`);
    } catch (err) {
        console.error(`Помилка таймера ${timeframeName}:`, err.message);
    }
}

cron.schedule('*/3 * * * *', () => sendAutoSignal("3 хвилини"));
cron.schedule('0 * * * *', () => sendAutoSignal("1 година"));
cron.schedule('0 */5 * * *', () => sendAutoSignal("5 годин"));

// ЗАГЛУШКА ДЛЯ РЕНДЕРА (відкриваємо порт, щоб Render не вимикав бота)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот працює!\n');
});
server.listen(PORT, () => {
    console.log(`Сервер заглушки запущено на порту ${PORT}`);
});

bot.launch()
    .then(() => console.log("🚀 Бот успішно запущений!"))
    .catch((err) => console.error("Помилка запуску:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
