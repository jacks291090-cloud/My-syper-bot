const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const axios = require('axios');

// Беремо токен з налаштувань Render
const botToken = process.env.TELEGRAM_TOKEN;
// Ваш особистий ID користувача зі скріншоту
const userId = "1994869835"; 

if (!botToken) {
    console.error("Помилка: Ви забули додати TELEGRAM_TOKEN в налаштуваннях Render (вкладка Environment)!");
    process.exit(1);
}

const bot = new Telegraf(botToken);
const pair = 'BTCUSDT'; 

// Обробка ручних команд користувача
bot.start((ctx) => ctx.reply('🤖 Бот активний! Сигнали на 3 хвилини, 1 годину та 5 годин запущені автоматично.'));

bot.command('price', async (ctx) => {
    try {
        const res = await axios.get(`https://binance.com{pair}`);
        const currentPrice = parseFloat(res.data.price).toFixed(2);
        await ctx.reply(`💰 Поточна ціна ${pair}: $${currentPrice}`);
    } catch (err) {
        await ctx.reply("❌ Помилка сервера біржі. Спробуйте ще раз.");
    }
});

// Функція автоматичного аналізу та відправки сповіщень
async function checkCryptoMarket(timeframeName) {
    try {
        const res = await axios.get(`https://binance.com{pair}`);
        const price = parseFloat(res.data.lastPrice).toFixed(2);
        const percent = parseFloat(res.data.priceChangePercent);

        let signalType = "⏳ ОЧІКУВАННЯ (ФЛЕТ)";
        let icon = "⚪";

        if (percent > 1.2) {
            signalType = "📈 ПОКУПКА (BUY)";
            icon = "🟢";
        } else if (percent < -1.2) {
            signalType = "📉 ПРОДАЖ (SELL)";
            icon = "🔴";
        }

        const msg = `${icon} **[АВТО-АНАЛІЗ: ${pair} | ТФ: ${timeframeName}]**\n\n` +
                    `💵 **Ціна монети:** $${price}\n` +
                    `📊 **Рух за 24г:** ${percent}%\n\n` +
                    `🤖 **Рішення алгоритму:** ${signalType}`;

        await bot.telegram.sendMessage(userId, msg, { parse_mode: "Markdown" });
        console.log(`[${timeframeName}] Сигнал успішно надіслано.`);
    } catch (err) {
        console.error(`Помилка під час аналізу на ТФ ${timeframeName}:`, err.message);
    }
}

// Налаштування таймерів cron
cron.schedule('*/3 * * * *', () => checkCryptoMarket("3 хвилини"));
cron.schedule('0 * * * *', () => checkCryptoMarket("1 година"));
cron.schedule('0 */5 * * *', () => checkCryptoMarket("5 годин"));

// Запуск бота в автономному режимі
bot.launch()
    .then(() => console.log("🚀 Бот успішно запущений і слухає сервер Telegram!"))
    .catch((err) => console.error("Критична помилка старту бота:", err));

// Коректне завершення роботи процесу при перезапуску сервера
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
