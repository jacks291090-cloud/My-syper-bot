const { Bot } = require('grammy'); 
const cron = require('node-cron');
const axios = require('axios');

// Беремо токен з Render
const token = process.env.TELEGRAM_TOKEN;
// Ваш ID зі скріншоту прописуємо напряму, щоб залізобетонно працювало
const chatId = "1994869835"; 

if (!token) {
    console.error("Помилка: Додайте TELEGRAM_TOKEN в Environment на Render!");
    process.exit(1);
}

const bot = new Bot(token);
const SYMBOL = 'BTCUSDT'; 

// Функція обробки команд від користувача (/start та /price)
bot.command('start', async (ctx) => {
    await ctx.reply(`Бот активований! Твій Chat ID: ${ctx.chat.id}\nТаймери сигналів на 3хв, 1г та 5г запущено.`);
});

bot.command('price', async (ctx) => {
    try {
        const response = await axios.get(`https://binance.com{SYMBOL}`);
        const price = parseFloat(response.data.price).toFixed(2);
        await ctx.reply(`💰 Поточна ціна ${SYMBOL}: $${price}`);
    } catch (error) {
        await ctx.reply("❌ Помилка зв'язку з біржею. Спробуйте пізніше.");
    }
});

// Функція для генерації автоматичних сигналів за розкладом
async function sendAutoSignal(timeframe) {
    try {
        const response = await axios.get(`https://binance.com{SYMBOL}`);
        const currentPrice = parseFloat(response.data.lastPrice).toFixed(2);
        const priceChangePercent = parseFloat(response.data.priceChangePercent);

        let action = "⏳ ОЧІКУВАННЯ (ФЛЕТ)";
        let emoji = "⚪";

        if (priceChangePercent > 1.5) { action = "📈 ПОКУПКА (BUY)"; emoji = "🍏"; }
        else if (priceChangePercent < -1.5) { action = "📉 ПРОДАЖ (SELL)"; emoji = "🍎"; }

        const text = `${emoji} **[АВТО-СИГНАЛ: ${SYMBOL} — ${timeframe}]**\n\n` +
                     `💰 **Ціна:** $${currentPrice}\n` +
                     `📊 **Зміна за 24г:** ${priceChangePercent}%\n\n` +
                     `🤖 **Рішення:** ${action}`;

        await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
        console.log(`Сигнал ${timeframe} успішно надіслано на ID ${chatId}`);
    } catch (error) {
        console.error(`Помилка таймера ${timeframe}:`, error.message);
    }
}

// Налаштування таймерів автоматичного надсилання
cron.schedule('*/3 * * * *', () => sendAutoSignal("3 хвилини"));
cron.schedule('0 * * * *', () => sendAutoSignal("1 година"));
cron.schedule('0 */5 * * *', () => sendAutoSignal("5 годин"));

// Запуск бота
bot.start();
console.log("Бот успішно перезапущений з новими таймерами!");
