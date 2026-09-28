const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'gerar',
  
  async execute(message, client) {
    // Cria sessão temporária
    if (!client.awaitingImage) client.awaitingImage = {};
    client.awaitingImage[message.author.id] = true;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('📤 Envie a imagem')
      .setDescription('Envie a imagem agora (como anexo)!\n⏰ Você tem 60 segundos.');
    
    await message.reply({ embeds: [embed] });
    
    // Remove sessão após 60s
    setTimeout(() => {
      if (client.awaitingImage?.[message.author.id]) {
        delete client.awaitingImage[message.author.id];
      }
    }, 60000);
  }
};
