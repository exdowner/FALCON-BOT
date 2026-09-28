const { setLogChannel } = require('../utils/storage');

module.exports = {
  name: 'logs',
  
  async execute(message) {
    const channel = message.mentions.channels.first() || message.channel;
    setLogChannel(message.author.id, channel.id);
    
    await message.reply(`✅ Logs configurados para: ${channel.toString()}`);
  }
};
