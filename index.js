const { Bot } = require('grammy'); // Або 'telegraf', залежно від вашої бібліотеки
const cron = require('node-cron');

// Отримуємо змінні з налаштувань Render
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
    console.error("Помилка: Перевірте налаштування TELEGRAM_TOKEN та CHAT_ID в Render!");
    process.exit(1);
}

const bot = new Bot(token);

// 1. Сигнал кожні 3 хвилини
cron.schedule('*/3 * * * *', async () => {
    try {
        await bot.api.sendMessage(chatId, "🤖 **[Швидкий сигнал — 3хв]**\nШІ проаналізував ринок. Змін не виявлено.", { parse_mode: "Markdown" });
        console.log("Сигнал 3хв надіслано");
    } catch (error) {
        console.error("Помилка відправки 3хв:", error);
    }
});

// 2. Сигнал кожну 1 годину
cron.schedule('0 * * * *', async () => {
    try {
        await bot.api.sendMessage(chatId, "📊 **[Аналітика — 1 година]**\nГодинний тренд залишається стабільним.", { parse_mode: "Markdown" });
        console.log("Сигнал 1г надіслано");
    } catch (error) {
        console.error("Помилка відправки 1г:", error);
    }
});

// 3. Сигнал кожні 5 годин
cron.schedule('0 */5 * * *', async () => {
    try {
        await bot.api.sendMessage(chatId, "🐋 **[Глобальний огляд — 5 годин]**\nШІ підготував детальний звіт.", { parse_mode: "Markdown" });
        console.log("Сигнал 5г надіслано");
    } catch (error) {
        console.error("Помилка відправки 5г:", error);
    }
});

// Запуск бота
bot.start();
console.log("🤖 Бот та планувальник сигналів Node.js успішно запущені!");
