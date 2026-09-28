const { EmbedBuilder } = require('discord.js');
const { getUserLinks, deleteLink } = require('../utils/storage');

module.exports = {
  name: 'manager',
  
  async execute(message) {
    const links = getUserLinks(message.author.id);
    
    if (links.length === 0) {
      return message.reply('❌ Você não tem links criados.');
    }
    
    let description = '';
    links.forEach((link, index) => {
      description += `**${index + 1}.** ID: \`${link.id}\` | Clicks: ${link.clicks}\n`;
      description += `Criado: ${new Date(link.createdAt).toLocaleDateString()}\n\n`;
    });
    
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🔗 Seus Links')
      .setDescription(description)
      .setFooter({ text: 'Para deletar um link, use: !delete <id>' });
    
    await message.reply({ embeds: [embed] });
  }
};
