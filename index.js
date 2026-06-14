const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const axios = require('axios');

const botToken = process.env.TELEGRAM_TOKEN;
const userId = "1994869835"; 

if (!botToken) {
    console.error("Помилка: Токен не знайдено!");
    process.exit(1);
}

const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply('🤖 Бот активований! Авто-сигнали на 3хв, 1г та 5г запущені. Напиши /price для перевірки курсу.'));

// Виправлена команда отримання ціни
bot.command('price', async (ctx) => {
    try {
        // Використовуємо стабільне та просте API від CoinGecko
        const res = await axios.get('https://coingecko.com');
        const currentPrice = res.data.bitcoin.usd;
        await ctx.reply(`💰 Поточна ціна BTC/USDT: $${currentPrice}`);
    } catch (err) {
        console.error("Помилка ручної команди:", err.message);
        await ctx.reply("❌ Помилка зв'язку з сервером ціни. Спробуйте ще раз.");
    }
});

// Виправлена функція для автоматичних сигналів за таймером
async function sendAutoSignal(timeframeName) {
    try {
        // Отримуємо ціну та зміну за 24 години
        const res = await axios.get('https://coingecko.com');
        const data = res.data[0];
        
        const price = data.current_price;
        const percent = parseFloat(data.price_change_percentage_24h).toFixed(2);

        let signalType = "⏳ ОЧІКУВАННЯ (ФЛЕТ)";
        let icon = "⚪";

        if (percent > 1.0) {
            signalType = "📈 ПОКУПКА (BUY)";
            icon = "🟢";
        } else if (percent < -1.0) {
            signalType = "📉 ПРОДАЖ (SELL)";
            icon = "🔴";
        }

        const msg = `${icon} **[АВТО-СИГНАЛ: BTC/USDT | ТФ: ${timeframeName}]**\n\n` +
                    `💵 **Ціна:** $${price}\n` +
                    `📊 **Змена за 24г:** ${percent}%\n\n` +
                    `🤖 **Рішення:** ${signalType}`;

        await bot.telegram.sendMessage(userId, msg, { parse_mode: "Markdown" });
        console.log(`[${timeframeName}] Сигнал успішно відправлено.`);
    } catch (err) {
        console.error(`Помилка таймера ${timeframeName}:`, err.message);
    }
}

// Налаштування таймерів відправки
cron.schedule('*/3 * * * *', () => sendAutoSignal("3 хвилини"));
cron.schedule('0 * * * *', () => sendAutoSignal("1 година"));
cron.schedule('0 */5 * * *', () => sendAutoSignal("5 годин"));

bot.launch()
    .then(() => console.log("🚀 Бот запущений з надійним CoinGecko API!"))
    .catch((err) => console.error("Помилка запуску:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
