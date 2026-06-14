const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const WebSocket = require('ws'); // Потрібно переконатися, що "ws" є в package.json
const http = require('http');

const botToken = process.env.TELEGRAM_TOKEN;
const userId = "1994869835"; 

if (!botToken) {
    console.error("Токен не знайдено!");
    process.exit(1);
}

const bot = new Telegraf(botToken);

// Створюємо глобальну змінну для збереження ціни в пам'яті бота
let btcPriceInMemory = "0.00";

// --- 1. ПІДКЛЮЧЕННЯ WEBSOCKET (ПОСТІЙНИЙ ПОТІК ЦІНИ) ---
// Цей потік працює безперервно і оновлює ціну кожну секунду без HTTP-запитів
const ws = new WebSocket('wss://://binance.com');

ws.on('message', (data) => {
    try {
        const json = JSON.parse(data);
        if (json && json.c) {
            btcPriceInMemory = parseFloat(json.c).toFixed(2); // 'c' — це поточна ціна в потоці Binance
        }
    } catch (e) {
        console.error("Помилка обробки WebSocket даних:", e.message);
    }
});

ws.on('error', (err) => {
    console.error("Помилка WebSocket з'єднання:", err.message);
});

ws.on('close', () => {
    console.log("WebSocket з'єднання закрилося. Спроба перезапуску...");
    // Якщо зв'язок обірветься, код автоматично перепідключиться через 5 секунд
    setTimeout(() => {
        process.exit(1); // Робимо краш, щоб Render сам перезапустив чистий процес
    }, 5000);
});


// --- 2. КОМАНДИ TELEGRAM БОТА ---
bot.start((ctx) => ctx.reply('🤖 Бот на WebSockets активований! Авто-сигнали на 3хв, 1г та 5г запущені. Напиши /price для перевірки курсу.'));

bot.command('price', async (ctx) => {
    // Бот більше нікуди не йде в інтернет, він миттєво бере ціну, яку вже спіймав WebSocket
    if (btcPriceInMemory === "0.00") {
        await ctx.reply("⏳ Секунду, бот підключається до потоку біржі та оновлює дані...");
    } else {
        await ctx.reply(`💰 Поточна ціна BTC/USDT (через потік): $${btcPriceInMemory}`);
    }
});


// --- 3. АВТОМАТИЧНІ СИГНАЛИ ЗА ТАЙМЕРОМ ---
async function sendAutoSignal(timeframeName) {
    if (btcPriceInMemory === "0.00") return; // Пропускаємо, якщо ціна ще не завантажилась

    let signalType = "⏳ ОЧІКУВАННЯ (АНАЛІЗ ТРЕНДУ)";
    let icon = "⚪";

    const msg = `${icon} **[АВТО-СИГНАЛ: BTC/USDT | ТФ: ${timeframeName}]**\n\n` +
                `💵 **Ціна з потоку:** $${btcPriceInMemory}\n\n` +
                `🤖 **Рішення алгоритму:** ${signalType}`;

    try {
        await bot.telegram.sendMessage(userId, msg, { parse_mode: "Markdown" });
        console.log(`[${timeframeName}] Сигнал успішно надіслано.`);
    } catch (err) {
        console.error(`Помилка відправки повідомлення ${timeframeName}:`, err.message);
    }
}

// Налаштування таймерів відправки
cron.schedule('*/3 * * * *', () => sendAutoSignal("3 хвилини"));
cron.schedule('0 * * * *', () => sendAutoSignal("1 година"));
cron.schedule('0 */5 * * *', () => sendAutoSignal("5 годин"));


// --- 4. ВЕБ-СЕРВЕР ДЛЯ ПРОХОДЖЕННЯ ПЕРЕВІРКИ RENDER ---
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Бот працює!\n');
});
server.listen(PORT, () => {
    console.log(`Сервер заглушки запущено на порту ${PORT}`);
});

bot.launch()
    .then(() => console.log("🚀 Бот успішно запущений і слухає потік WebSocket!"))
    .catch((err) => console.error("Помилка запуска бота:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
