const { Telegraf } = require('telegraf');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
    res.send('Бот працює і не спить!');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер працює на порті ${PORT}`));

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Привіт! Я працюю прямо з Render і ніколи не засну!'));

bot.on('text', (ctx) => {
    ctx.reply(`Ти написав: ${ctx.message.text}`);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
