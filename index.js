const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const axios = require('axios');
const http = require('http');

const botToken = process.env.TELEGRAM_TOKEN;
const userId = "1994869835"; 

if (!botToken) {
    console.error("Токен не знайдено!");
    process.exit(1);
}

const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply('🤖 Бот активований! Авто-сигнали на 3хв, 1г та 5г запущені. Напиши /price для перевірки курсу.'));

// Команда ручної перевірки ціни з точним шляхом до ціни
bot.command('price', async (ctx) => {
    try {
        const res = await axios.get('https://mempool.space');
        // ТОЧНИЙ ШЛЯХ: res.data.USD.price замість res.data.USD
        const currentPrice = parseFloat(res.data.USD.price).toFixed(2);
        await ctx.reply(`💰 Поточна ціна BTC/USD: $${currentPrice}`);
    } catch (err) {
        console.error("Помилка команди:", err.message);
        await ctx.reply("❌ Помилка зв'язку з сервером ціни. Спробуйте ще раз.");
    }
});

// Функція автоматичного аналізу та сигналів
async function sendAutoSignal(timeframeName) {
    try {
        const res = await axios.get('https://mempool.space');
        // ТОЧНИЙ ШЛЯХ: res.data.USD.price замість res.data.USD
        const price = parseFloat(res.data.USD.price).toFixed(2);

        let signalType = "⏳ ОЧІКУВАННЯ (АНАЛІЗ ТРЕНДУ)";
        let icon = "⚪";

        const msg = `${icon} **[АВТО-СИГНАЛ: BTC/USD | ТФ: ${timeframeName}]**\n\n` +
                    `💵 **Ціна:** $${price}\n\n` +
                    `🤖 **Рішення алгоритму:** ${signalType}`;

        await bot.telegram.sendMessage(userId, msg, { parse_mode: "Markdown" });
        console.log(`[${timeframeName}] Сигнал успішно надіслано.`);
    } catch (err) {
        console.error(`Помилка таймера ${timeframeName}:`, err.message);
    }
}

// Налаштування таймерів відправки
cron.schedule('*/3 * * * *', () => sendAutoSignal("3 хвилини"));
cron.schedule('0 * * * *', () => sendAutoSignal("1 година"));
cron.schedule('0 */5 * * *', () => sendAutoSignal("5 годин"));

// Веб-сервер для проходження перевірки Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот працює!\n');
});
server.listen(PORT, () => {
    console.log(`Сервер заглушки запущено на порту ${PORT}`);
});

bot.launch()
    .then(() => console.log("🚀 Бот успішно запущений і слухає сервер Telegram!"))
    .catch((err) => console.error("Помилка запуска:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
