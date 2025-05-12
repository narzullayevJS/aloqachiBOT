require('dotenv').config();
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');

const bot = new Telegraf(process.env.BOT_TOKEN);
const sessions = new Map();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB ulandi');
}).catch((err) => {
  console.error('❌ MongoDB xatosi:', err);
});


const mainMenu = {
  reply_markup: {
    keyboard: [
      ['📅 Yangi uchrashuv'],
      ['🗓 Uchrashuvlarim', '📞 Bog‘lanish']
    ],
    resize_keyboard: true
  }
};

bot.start((ctx) => {
  ctx.reply(`👋 Salom, ${ctx.from.first_name}!\nQuyidagilardan birini tanlang:`, mainMenu);
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const session = sessions.get(chatId) || {};

  if (text === '📅 Yangi uchrashuv') {
    sessions.set(chatId, { step: 'get_name' });
    return ctx.reply('👤 Iltimos, to‘liq ismingizni kiriting:');
  }

  if (session.step === 'get_name') {
    session.name = text;
    session.step = 'get_address';
    sessions.set(chatId, session);
    return ctx.reply('📍 Uchrashuv manzilini kiriting:');
  }

  if (session.step === 'get_address') {
    session.address = text;
    session.step = 'get_day';
    sessions.set(chatId, session);
    return ctx.reply('📅 Qaysi kunga yozilmoqchisiz?', {
      reply_markup: {
        keyboard: [
          ['Dushanba', 'Seshanba'],
          ['Chorshanba', 'Payshanba'],
          ['Juma', 'Shanba', 'Yakshanba']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }

  if (session.step === 'get_day') {
    const days = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
    if (!days.includes(text)) return ctx.reply('❗ Tugmalardan foydalaning.');
    session.day = text;
    session.step = 'confirm';
    sessions.set(chatId, session);

    return ctx.reply(`✅ Uchrashuv ma'lumotlari:

👤 Ism: ${session.name}
📍 Manzil: ${session.address}
📅 Kuni: ${session.day}

Barchasi to‘g‘rimi?`, {
      reply_markup: {
        keyboard: [['✅ Ha', '❌ Bekor qilish']],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }

  if (session.step === 'confirm') {
    if (text === '✅ Ha') {
      const newAppointment = new Appointment({
        chatId,
        name: session.name,
        address: session.address,
        day: session.day
      });
      await newAppointment.save();

      await ctx.reply('✅ Uchrashuv saqlandi.', mainMenu);

      await bot.telegram.sendMessage(process.env.ADMIN_ID, `📥 Yangi uchrashuv:\n👤 ${session.name}\n📍 ${session.address}\n📅 ${session.day}`);
      sessions.delete(chatId);
    } else if (text === '❌ Bekor qilish') {
      ctx.reply('❌ Uchrashuv bekor qilindi.', mainMenu);
      sessions.delete(chatId);
    }
  }

  if (text === '🗓 Uchrashuvlarim') {
    const appointments = await Appointment.find({ chatId });
    if (appointments.length === 0) return ctx.reply('Sizda hech qanday uchrashuv yo‘q.');
    let msg = '📋 Uchrashuvlaringiz:\n\n';
    appointments.forEach((a, i) => {
      msg += `${i + 1}. 👤 ${a.name}\n📍 ${a.address}\n📅 ${a.day}\n\n`;
    });
    ctx.reply(msg);
  }

  if (text === '📞 Bog‘lanish') {
    ctx.reply('📞 Biz bilan bog‘lanish: @narzullayev_JS yoki +998 88 676 91 94');
  }
});


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch();
