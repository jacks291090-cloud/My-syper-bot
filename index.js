const axios = require('axios'); // Додайте на початку файлу для запитів в інтернет

// Модернізований сигнал для BTC/USDT кожні 3 хвилини
cron.schedule('*/3 * * * *', async () => {
    try {
        // Безкоштовний запит ціни з Binance API
        const response = await axios.get('https://binance.com');
        const price = parseFloat(response.data.price).toFixed(2);
        
        let Action = "ОЧІКУВАННЯ";
        // Тут ШІ може аналізувати ціну, для прикладу просто виведемо її:
        let messageText = `🤖 **[Сигнал BTC/USDT — 3хв]**\n💰 Поточна ціна: $${price}\n📊 Рекомендація ШІ: ${Action}`;
        
        await bot.api.sendMessage(chatId, messageText, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Помилка отримання ціни з Binance:", error);
    }
});
