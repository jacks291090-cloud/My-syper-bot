const { Bot } = require('grammy'); // Якщо у вас бібліотека telegraf, замініть на require('telegraf')
const cron = require('node-cron');
const axios = require('axios');

// Завантаження секретних ключів з налаштувань Render
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
    console.error("Помилка: Додайте TELEGRAM_TOKEN та CHAT_ID в Environment на Render!");
    process.exit(1);
}

const bot = new Bot(token);
const SYMBOL = 'BTCUSDT'; // Торгова пара (можна замінити на ETHUSDT або SOLUSDT)

// Функція для збору цін та генерації реального сигналу
async function generateSignal(timeframe) {
    try {
        // Отримуємо поточну ціну та статистику за 24 години з Binance API
        const response = await axios.get(`https://binance.com{SYMBOL}`);
        const currentPrice = parseFloat(response.data.lastPrice).toFixed(2);
        const priceChangePercent = parseFloat(response.data.priceChangePercent);
        const highPrice = parseFloat(response.data.highPrice).toFixed(2);
        const lowPrice = parseFloat(response.data.lowPrice).toFixed(2);

        // Проста математична логіка ШІ-аналізу (на основі волатильності)
        let action = "⏳ ОЧІКУВАННЯ (ФЛЕТ)";
        let emoji = "⚪";

        if (priceChangePercent > 3.5) {
            action = "🚀 СИЛЬНА ПОКУПКА (STRONG BUY)";
            emoji = "🟢";
        } else if (priceChangePercent > 1.0) {
            action = "📈 ПОКУПКА (BUY)";
            emoji = "🍏";
        } else if (priceChangePercent < -3.5) {
            action = "🚨 СИЛЬНИЙ ПРОДАЖ (STRONG SELL)";
            emoji = "🔴";
        } else if (priceChangePercent < -1.0) {
            action = "📉 ПРОДАЖ (SELL)";
            emoji = "🍎";
        }

        // Формуємо красивий текст сигналу для Telegram
        return `${emoji} **[СИГНАЛ: ${SYMBOL} — ТФ ${timeframe}]**\n\n` +
               `💰 **Поточна ціна:** $${currentPrice}\n` +
               `📊 **Зміна за добу:** ${priceChangePercent > 0 ? '+' : ''}${priceChangePercent}%\n` +
               `🔝 **24h Макс:** $${highPrice} | 🛑 **24h Мін:** $${lowPrice}\n\n` +
               `🤖 **Рішення ШІ:** ${action}\n` +
               `⚠️ *Не є фінансовою порадою.*`;

    } catch (error) {
        console.error(`Помилка аналізу для ${SYMBOL}:`, error.message);
        return `❌ Помилка роботи ШІ-модуля для пари ${SYMBOL}.`;
    }
}

// 1. Таймер: Кожні 3 хвилини (Скальпінг)
cron.schedule('*/3 * * * *', async () => {
    console.log("Обробка сигналу 3 хвилини...");
    const text = await generateSignal("3хв");
    try { await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" }); } catch (e) { console.error(e); }
});

// 2. Таймер: Кожну 1 годину (Інтрадей трендінг)
cron.schedule('0 * * * *', async () => {
    console.log("Обробка сигналу 1 година...");
    const text = await generateSignal("1г");
    try { await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" }); } catch (e) { console.error(e); }
});

// 3. Таймер: Кожні 5 годин (Глобальний тренд)
cron.schedule('0 */5 * * *', async () => {
    console.log("Обробка сигналу 5 годин...");
    const text = await generateSignal("5г");
    try { await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" }); } catch (e) { console.error(e); }
});

// Старт бота
bot.start();
console.log(`🤖 ШІ-бот для пари ${SYMBOL} запущений і рахує таймери!`);
