require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { loadConfig, saveConfig, resetConfig } = require('./config');
const { v4: uuidv4 } = require('uuid');

// Vérifier les variables d'environnement
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN n\'est pas défini dans le fichier .env');
    process.exit(1);
}

if (!process.env.ADMIN_ID) {
    console.error('❌ ADMIN_ID n\'est pas défini dans le fichier .env');
    process.exit(1);
}

// Initialiser le bot avec gestion d'erreurs améliorée
const bot = new TelegramBot(process.env.BOT_TOKEN, { 
    polling: {
        interval: 1000,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// État des utilisateurs
const userStates = {};
const activeMessages = {};
const users = new Set();
const admins = new Set([ADMIN_ID]);

// Configuration globale
let config = {};

// Temps de démarrage
const botStartTime = new Date();

// Schéma MongoDB pour les utilisateurs
const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    isAdmin: { type: Boolean, default: false },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model('BotUser', userSchema);

// Fonction pour échapper le HTML et permettre le formatage
function escapeHtml(text) {
    if (!text) return '';
    // Échapper les caractères HTML dangereux mais permettre le formatage
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Fonction pour formater le texte avec HTML
function formatText(text) {
    if (!text) return '';
    
    // Support pour le formatage HTML de Telegram
    // <b>gras</b>, <i>italique</i>, <u>souligné</u>, <s>barré</s>, <code>code</code>, <pre>préformaté</pre>
    // <a href="url">lien</a>, <tg-spoiler>spoiler</tg-spoiler>
    
    // Échapper les caractères HTML dangereux mais préserver le formatage
    return escapeHtml(text);
}

// Fonction pour envoyer ou éditer un message avec gestion d'erreurs améliorée
async function sendOrEditMessage(chatId, text, keyboard = null, parseMode = 'HTML', messageId = null) {
    const options = {
        parse_mode: parseMode,
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    };

    try {
        if (messageId) {
            // Essayer d'éditer le message existant
            const result = await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...options
            });
            return result;
        }
    } catch (error) {
        // Si l'édition échoue, envoyer un nouveau message
        console.log('Édition échouée, envoi d\'un nouveau message:', error.message);
    }

    // Envoyer un nouveau message
    return await bot.sendMessage(chatId, text, options);
}

// Fonction pour envoyer une photo avec gestion d'erreurs améliorée
async function sendOrEditPhoto(chatId, photo, caption, keyboard = null, messageId = null) {
    const options = {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    };

    try {
        if (messageId) {
            // Essayer d'éditer avec une nouvelle photo
            await bot.editMessageMedia({
                type: 'photo',
                media: photo,
                caption: caption,
                parse_mode: 'HTML'
            }, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
            });
            return { message_id: messageId };
        }
    } catch (error) {
        console.log('Édition de photo échouée, envoi d\'une nouvelle photo:', error.message);
    }

    return await bot.sendPhoto(chatId, photo, options);
}

// Charger la configuration au démarrage
async function initializeBot() {
    try {
        config = await loadConfig();
        console.log('✅ Configuration chargée');
        
        // Charger les utilisateurs existants
        const existingUsers = await User.find();
        existingUsers.forEach(user => {
            users.add(user.userId);
            if (user.isAdmin) {
                admins.add(user.userId);
            }
        });
        console.log(`✅ ${existingUsers.length} utilisateurs chargés`);
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la configuration:', error);
        process.exit(1);
    }
}

// Connexion à MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error);
        process.exit(1);
    }
}

// Fonction pour vérifier si l'utilisateur est admin
function isAdmin(userId) {
    return admins.has(userId) || userId === ADMIN_ID;
}

// Fonction pour ajouter un utilisateur
async function addUser(user) {
    try {
        const existingUser = await User.findOne({ userId: user.id });
        if (!existingUser) {
            const newUser = new User({
                userId: user.id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin: user.id === ADMIN_ID
            });
            await newUser.save();
            users.add(user.id);
            if (newUser.isAdmin) {
                admins.add(user.id);
            }
            console.log(`✅ Nouvel utilisateur ajouté: ${user.first_name} (${user.id})`);
        } else {
            // Mettre à jour les informations
            existingUser.username = user.username;
            existingUser.firstName = user.first_name;
            existingUser.lastName = user.last_name;
            existingUser.lastSeen = new Date();
            await existingUser.save();
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'utilisateur:', error);
    }
}

// Commande /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'utilisateur';

    // Ajouter l'utilisateur
    await addUser(msg.from);

    // Supprimer l'ancien menu s'il existe
    if (activeMessages[userId]) {
        try {
            await bot.deleteMessage(chatId, activeMessages[userId]);
        } catch (error) {
            // Ignorer si le message n'existe plus
        }
    }

    // Préparer le message d'accueil avec formatage HTML
    const welcomeText = config.welcomeMessage.replace('{firstname}', firstName);
    
    // Créer le clavier principal
    const keyboard = [];
    
    // Mini App toujours en première ligne
    if (config.miniApp?.url) {
        keyboard.push([{ 
            text: config.miniApp.text || '🎮 Ouvrir l\'application', 
            web_app: { url: config.miniApp.url } 
        }]);
    }
    
    // Services sur des lignes séparées
    if (config.servicesEnabled) {
        keyboard.push([{ text: '🚚 Livraison', callback_data: 'service_livraison' }]);
        keyboard.push([{ text: '📮 Postal', callback_data: 'service_postal' }]);
        keyboard.push([{ text: '📍 Meet Up', callback_data: 'service_meetup' }]);
    }
    
    // Réseaux sociaux (un par ligne)
    if (config.socialNetworks && config.socialNetworks.length > 0) {
        for (const social of config.socialNetworks) {
            keyboard.push([{
                text: `${social.emoji} ${social.name}`,
                url: social.url
            }]);
        }
    }
    
    // Envoyer le nouveau message
    let result;
    if (config.welcomeImage) {
        result = await bot.sendPhoto(chatId, config.welcomeImage, {
            caption: welcomeText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        result = await bot.sendMessage(chatId, welcomeText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
    
    // Sauvegarder le nouveau messageId
    activeMessages[userId] = result.message_id;
});

// Commande /admin
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ Accès refusé. Cette commande est réservée aux administrateurs.');
        return;
    }

    // Supprimer l'ancien menu s'il existe
    if (activeMessages[userId]) {
        try {
            await bot.deleteMessage(chatId, activeMessages[userId]);
        } catch (error) {
            // Ignorer si le message n'existe plus
        }
    }

    await showAdminMenu(chatId, userId);
});

// Commande /config - Afficher la configuration actuelle
bot.onText(/\/config/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ Accès refusé. Cette commande est réservée aux administrateurs.');
        return;
    }
    
    await showCurrentConfig(chatId, userId);
});

// Afficher le menu admin
async function showAdminMenu(chatId, userId, messageId = null) {
    const stats = await getStats();
    
    const keyboard = [
        [{ text: '✏️ Message d\'accueil', callback_data: 'admin_welcome' }],
        [{ text: '🖼️ Photo d\'accueil', callback_data: 'admin_photo' }],
        [{ text: '📱 Mini Application', callback_data: 'admin_miniapp' }],
        [{ text: '🔗 Gérer Réseaux Sociaux', callback_data: 'admin_social' }],
        [{ text: '🚚 Gérer Services', callback_data: 'admin_services' }],
        [{ text: '📊 Statistiques', callback_data: 'admin_stats' }],
        [{ text: '👥 Gérer Admins', callback_data: 'admin_manage' }],
        [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }],
        [{ text: '🔧 Voir Configuration', callback_data: 'admin_view_config' }]
    ];
    
    const text = `🔧 <b>Panel d'Administration</b>\n\n` +
                 `👥 Utilisateurs: ${stats.totalUsers}\n` +
                 `📊 Démarrages: ${stats.totalStarts}\n` +
                 `👨‍💼 Admins: ${stats.totalAdmins}\n` +
                 `⏰ Uptime: ${getUptime()}`;
    
    const result = await sendOrEditMessage(chatId, text, keyboard, 'HTML', messageId || activeMessages[userId]);
    activeMessages[userId] = result.message_id;
}

// Afficher la configuration actuelle
async function showCurrentConfig(chatId, userId, messageId = null) {
    const configText = `🔧 <b>Configuration Actuelle</b>\n\n` +
                      `📝 <b>Message d'accueil:</b>\n${config.welcomeMessage?.substring(0, 200)}...\n\n` +
                      `📱 <b>Mini App:</b> ${config.miniApp?.url || 'Non définie'}\n` +
                      `🖼️ <b>Photo d'accueil:</b> ${config.welcomeImage ? 'Définie' : 'Non définie'}\n\n` +
                      `🚚 <b>Services:</b> ${config.servicesEnabled ? 'Activés' : 'Désactivés'}\n` +
                      `📮 <b>Sous-menus Postal:</b> ${config.postalSubmenus?.length || 0}\n` +
                      `🚚 <b>Sous-menus Livraison:</b> ${config.livraisonSubmenus?.length || 0}\n` +
                      `📍 <b>Sous-menus Meet Up:</b> ${config.meetupSubmenus?.length || 0}\n\n` +
                      `🔗 <b>Réseaux sociaux:</b> ${config.socialNetworks?.length || 0}\n` +
                      `👥 <b>Utilisateurs:</b> ${users.size}\n` +
                      `👨‍💼 <b>Admins:</b> ${admins.size}\n\n` +
                      `📅 <b>Dernière modification:</b>\n${new Date(config.lastModified || Date.now()).toLocaleString('fr-FR')}`;

    const keyboard = [
        [{ text: '🔙 Retour Admin', callback_data: 'admin_back' }]
    ];

    const result = await sendOrEditMessage(chatId, configText, keyboard, 'HTML', messageId || activeMessages[userId]);
    activeMessages[userId] = result.message_id;
}

// Afficher un service avec ses sous-menus
async function showService(chatId, userId, serviceType, messageId) {
    let text, image, submenus;
    
    switch(serviceType) {
        case 'livraison':
            text = config.livraisonText;
            image = config.livraisonImage;
            submenus = config.livraisonSubmenus || [];
            break;
        case 'postal':
            text = config.postalText;
            image = config.postalImage;
            submenus = config.postalSubmenus || [];
            break;
        case 'meetup':
            text = config.meetupText;
            image = config.meetupImage;
            submenus = config.meetupSubmenus || [];
            break;
    }
    
    const keyboard = [];
    
    // Ajouter les sous-menus
    for (const submenu of submenus) {
        keyboard.push([{ 
            text: submenu.name, 
            callback_data: `submenu_${serviceType}_${submenu.id}` 
        }]);
    }
    
    keyboard.push([{ text: '🔙 Retour au menu', callback_data: 'back_to_start' }]);
    
    if (image) {
        await sendOrEditPhoto(chatId, image, text, keyboard, messageId);
    } else {
        await sendOrEditMessage(chatId, text, keyboard, 'HTML', messageId);
    }
}

// Afficher le contenu d'un sous-menu
async function showSubmenuContent(chatId, userId, serviceType, submenuId, messageId) {
    let submenu;
    let submenus = [];
    
    switch(serviceType) {
        case 'livraison':
            submenus = config.livraisonSubmenus || [];
            break;
        case 'postal':
            submenus = config.postalSubmenus || [];
            break;
        case 'meetup':
            submenus = config.meetupSubmenus || [];
            break;
    }
    
    submenu = submenus.find(s => s.id === submenuId);
    
    if (!submenu) {
        await sendOrEditMessage(
            chatId,
            '❌ Sous-menu non trouvé',
            [[{ text: '🔙 Retour', callback_data: `service_${serviceType}` }]],
            'HTML',
            messageId
        );
        return;
    }
    
    const keyboard = [[{ text: '🔙 Retour', callback_data: `service_${serviceType}` }]];
    
    if (submenu.image) {
        await sendOrEditPhoto(chatId, submenu.image, submenu.text || submenu.name, keyboard, messageId);
    } else {
        await sendOrEditMessage(chatId, submenu.text || submenu.name, keyboard, 'HTML', messageId);
    }
}

// Gestion des callbacks
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    // Mettre à jour l'état avec le messageId
    activeMessages[userId] = messageId;
    
    // Répondre au callback
    await bot.answerCallbackQuery(query.id);
    
    try {
        switch(data) {
            // Menu principal
            case 'back_to_start':
                // Simuler un /start
                const mockMsg = {
                    chat: { id: chatId },
                    from: query.from,
                    text: '/start'
                };
                await bot.emit('message', mockMsg);
                break;
                
            // Services
            case 'service_livraison':
                await showService(chatId, userId, 'livraison', messageId);
                break;
                
            case 'service_postal':
                await showService(chatId, userId, 'postal', messageId);
                break;
                
            case 'service_meetup':
                await showService(chatId, userId, 'meetup', messageId);
                break;
                
            // Admin
            case 'admin_back':
                if (isAdmin(userId)) {
                    await showAdminMenu(chatId, userId, messageId);
                }
                break;
                
            case 'admin_view_config':
                if (isAdmin(userId)) {
                    await showCurrentConfig(chatId, userId, messageId);
                }
                break;
                
            // Autres callbacks admin
            default:
                if (data.startsWith('submenu_')) {
                    const parts = data.split('_');
                    const serviceType = parts[1];
                    const submenuId = parts[2];
                    await showSubmenuContent(chatId, userId, serviceType, submenuId, messageId);
                } else if (isAdmin(userId)) {
                    // Gérer les autres callbacks admin
                    await handleAdminCallbacks(query);
                }
        }
    } catch (error) {
        console.error('Erreur dans le callback:', error);
        await bot.sendMessage(chatId, '❌ Une erreur est survenue. Veuillez réessayer.');
    }
});

// Gérer les callbacks admin
async function handleAdminCallbacks(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    switch(data) {
        case 'admin_welcome':
            userStates[userId] = { state: 'waiting_welcome' };
            await sendOrEditMessage(
                chatId,
                '✏️ <b>Modifier le message d\'accueil</b>\n\n' +
                'Envoyez le nouveau message.\n' +
                'Utilisez {firstname} pour inclure le prénom.\n\n' +
                '<i>💡 Formatage HTML supporté :</i>\n' +
                '<b>gras</b>, <i>italique</i>, <u>souligné</u>\n' +
                '<s>barré</s>, <code>code</code>, <pre>préformaté</pre>\n' +
                '<a href="https://example.com">lien</a>',
                [[{ text: '❌ Annuler', callback_data: 'admin_back' }]],
                'HTML',
                messageId
            );
            break;
            
        case 'admin_stats':
            const stats = await getStats();
            await sendOrEditMessage(
                chatId,
                `📊 <b>Statistiques détaillées</b>\n\n` +
                `👥 Total utilisateurs: ${stats.totalUsers}\n` +
                `🚀 Démarrages: ${stats.totalStarts}\n` +
                `👨‍💼 Administrateurs: ${stats.totalAdmins}\n` +
                `⏰ Uptime: ${getUptime()}\n` +
                `🔄 Redémarrages: ${process.env.PM2_RESTART_COUNT || 'N/A'}`,
                [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
                'HTML',
                messageId
            );
            break;
    }
}

// Gestion des messages texte
bot.on('message', async (msg) => {
    if (msg.text && (msg.text.startsWith('/start') || msg.text.startsWith('/admin') || msg.text.startsWith('/config'))) {
        return; // Ignorer les commandes
    }
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = userStates[userId];
    
    if (!state) return;
    
    // Gestion du message d'accueil
    if (state.state === 'waiting_welcome') {
        // Formater le texte pour supporter HTML
        const formattedText = formatText(msg.text);
        config.welcomeMessage = formattedText;
        await saveConfig(config);
        delete userStates[userId];
        
        await sendOrEditMessage(
            chatId,
            '✅ Message d\'accueil mis à jour !\n\n<i>Le formatage HTML est supporté :</i>\n<b>gras</b>, <i>italique</i>, <u>souligné</u>, <s>barré</s>, <code>code</code>',
            [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
            'HTML',
            activeMessages[userId]
        );
    }
});

// Fonctions utilitaires
function getStats() {
    return {
        totalUsers: users.size,
        totalStarts: users.size, // Approximation
        totalAdmins: admins.size
    };
}

function getUptime() {
    const uptime = Date.now() - botStartTime.getTime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}j ${hours}h ${minutes}m`;
}

// Gestion des erreurs
bot.on('polling_error', (error) => {
    console.error('Erreur de polling:', error);
});

bot.on('error', (error) => {
    console.error('Erreur du bot:', error);
});

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', async () => {
    console.log('🛑 Arrêt du bot...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Arrêt du bot...');
    await mongoose.connection.close();
    process.exit(0);
});

// Démarrage du bot
async function startBot() {
    console.log('🤖 Bot LANATION démarré !');
    console.log(`📱 Token: ${process.env.BOT_TOKEN.substring(0, 10)}...`);
    console.log(`👤 Admin: ${process.env.ADMIN_ID}`);
    
    await connectToDatabase();
    await initializeBot();
    
    console.log('🤖 Bot LANATION prêt!');
}

startBot().catch(error => {
    console.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
});