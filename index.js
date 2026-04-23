const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionsBitField, REST, Routes } = require('discord.js');
const { QuickDB } = require('quick.db');
const express = require('express');
const cors = require('cors');
const db = new QuickDB();
const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('قائمة أوامر بوت BZM TOWN'),
    new SlashCommandBuilder().setName('رصيدي').setDescription('تشوف رصيدك'),
    new SlashCommandBuilder().setName('فلوس').setDescription('للأدمن - تحديد رصيد').addIntegerOption(o => o.setName('المبلغ').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('تحويل').setDescription('تحويل فلوس').addUserOption(o => o.setName('الشخص').setDescription('الشخص').setRequired(true)).addIntegerOption(o => o.setName('المبلغ').setDescription('المبلغ').setRequired(true)),
    new SlashCommandBuilder().setName('ضريبة').setDescription('للأدمن - تعديل الضريبة').addIntegerOption(o => o.setName('النسبة').setDescription('نسبة الضريبة 0-100').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('تم تسجيل الأوامر');
    } catch (error) { console.error(error); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;
    
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 أوامر BZM TOWN')
            .setDescription('**الأنظمة الأساسية:**\n💰 `/رصيدي` - رصيدك\n💸 `/تحويل` - حول فلوس\n⚙️ `/فلوس` - للأدمن\n📊 `/ضريبة` - للأدمن\n\n**لوحة التحكم على الموقع**')
            .setColor('#00ff00');
        await interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'رصيدي') {
        let money = await db.get(`money_${interaction.user.id}`) || 0;
        await interaction.reply(`💵 رصيدك: ${money} ريال`);
    }
    
    if (commandName === 'فلوس') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply('❌ للأدمن فقط');
        const amount = interaction.options.getInteger('المبلغ');
        await db.set(`money_${interaction.user.id}`, amount);
        await interaction.reply(`✅ تم تحديد رصيدك: ${amount} ريال`);
    }
    
    if (commandName === 'ضريبة') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply('❌ للأدمن فقط');
        const tax = interaction.options.getInteger('النسبة');
        await db.set(`tax_${interaction.guild.id}`, tax);
        await interaction.reply(`✅ تم تحديث الضريبة إلى ${tax}%`);
    }
    
    if (commandName === 'تحويل') {
        const user = interaction.options.getUser('الشخص');
        const amount = interaction.options.getInteger('المبلغ');
        let senderMoney = await db.get(`money_${interaction.user.id}`) || 0;
        let tax = await db.get(`tax_${interaction.guild.id}`) || 5;
        let taxAmount = Math.floor(amount * (tax / 100));
        let total = amount + taxAmount;
        if (senderMoney < total) return interaction.reply(`❌ رصيدك ما يكفي. تحتاج ${total} مع الضريبة ${tax}%`);
        await db.sub(`money_${interaction.user.id}`, total);
        await db.add(`money_${user.id}`, amount);
        await interaction.reply(`✅ حولت ${amount} لـ ${user}\n💸 الضريبة: ${taxAmount} ريال`);
    }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
    <title>BZM TOWN</title>
    <style>
    body{background:#0f0f0f;color:white;font-family:Arial;padding:20px;text-align:center}
    h1{color:#00ff00;font-size:28px} .btn{background:#00ff00;color:#000;padding:15px 30px;border:none;border-radius:10px;font-size:18px;margin:10px;text-decoration:none;display:inline-block;font-weight:bold}
    .box{background:#1a1a1a;padding:20px;border-radius:15px;margin:20px 0}
    </style></head>
    <body>
    <h1>🤖 BZM TOWN شغال</h1>
    <div class="box">
    <p>البوت أونلاين في ${client.guilds.cache.size} سيرفر</p>
    <a class="btn" href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands">➕ اضافة البوت</a>
    </div>
    <div class="box">
    <h2>الأوامر</h2>
    <p>/help - كل الأوامر<br>/رصيدي - رصيدك<br>/تحويل - حول فلوس</p>
    </div>
    </body></html>
    `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
client.login(TOKEN);
