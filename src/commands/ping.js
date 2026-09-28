const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  
  async execute(message, client) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latência', value: `${Date.now() - message.createdTimestamp}ms`, inline: true },
        { name: 'API Latência', value: `${Math.round(client.ws.ping)}ms`, inline: true }
      );
    
    await message.reply({ embeds: [embed] });
  }
};
