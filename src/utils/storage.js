const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/links.json');

// Cria pasta data se não existir
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ links: [], users: {} }));
}

function load() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  createLink(userId, imageUrl) {
    const data = load();
    const id = require('uuid').v4().split('-')[0];
    
    const link = {
      id,
      userId,
      imageUrl,
      createdAt: new Date().toISOString(),
      clicks: 0,
      logs: []
    };
    
    data.links.push(link);
    save(data);
    return link;
  },
  
  getLink(id) {
    const data = load();
    return data.links.find(l => l.id === id);
  },
  
  getUserLinks(userId) {
    const data = load();
    return data.links.filter(l => l.userId === userId);
  },
  
  deleteLink(id, userId) {
    const data = load();
    const index = data.links.findIndex(l => l.id === id && l.userId === userId);
    if (index > -1) {
      data.links.splice(index, 1);
      save(data);
      return true;
    }
    return false;
  },
  
  addLog(id, logData) {
    const data = load();
    const link = data.links.find(l => l.id === id);
    if (link) {
      link.clicks++;
      link.logs.push(logData);
      save(data);
    }
  },
  
  setLogChannel(userId, channelId) {
    const data = load();
    if (!data.users[userId]) data.users[userId] = {};
    data.users[userId].logChannel = channelId;
    save(data);
  },
  
  getLogChannel(userId) {
    const data = load();
    return data.users[userId]?.logChannel;
  }
};
