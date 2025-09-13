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
async function sendOrEditMessage(chatId, text, options = {}, parseMode = 'HTML') {
    const messageOptions = {
        parse_mode: parseMode,
        ...options
    };

    try {
        if (activeMessages[chatId]) {
            // Essayer d'éditer le message existant
            try {
                const result = await bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: activeMessages[chatId],
                    ...messageOptions
                });
                return result;
            } catch (editError) {
                // Si l'édition échoue, supprimer l'ancien message et envoyer un nouveau
                try {
                    await bot.deleteMessage(chatId, activeMessages[chatId]);
                } catch (deleteError) {
                    // Ignorer si le message n'existe plus
                }
            }
        }
    } catch (error) {
        console.log('Erreur édition message:', error.message);
    }

    // Envoyer un nouveau message
    const result = await bot.sendMessage(chatId, text, messageOptions);
    activeMessages[chatId] = result.message_id;
    return result;
}

// Fonction pour envoyer une photo avec gestion d'erreurs améliorée
async function sendOrEditPhoto(chatId, photo, caption, options = {}) {
    const messageOptions = {
        caption: caption,
        parse_mode: 'HTML',
        ...options
    };

    try {
        if (activeMessages[chatId]) {
            try {
                await bot.editMessageMedia({
                    type: 'photo',
                    media: photo,
                    caption: caption,
                    parse_mode: 'HTML'
                }, {
                    chat_id: chatId,
                    message_id: activeMessages[chatId],
                    ...options
                });
                return { message_id: activeMessages[chatId] };
            } catch (editError) {
                try {
                    await bot.deleteMessage(chatId, activeMessages[chatId]);
                } catch (deleteError) {
                    // Ignorer si le message n'existe plus
                }
            }
        }
    } catch (error) {
        console.log('Erreur édition photo:', error.message);
    }

    const result = await bot.sendPhoto(chatId, photo, messageOptions);
    activeMessages[chatId] = result.message_id;
    return result;
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

// Connexion à MongoDB avec options corrigées
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
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
    if (config.welcomeImage) {
        await bot.sendPhoto(chatId, config.welcomeImage, {
            caption: welcomeText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await bot.sendMessage(chatId, welcomeText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
});

// Commande /admin
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ Accès refusé. Cette commande est réservée aux administrateurs.');
        return;
    }

    await showAdminMenu(chatId, userId);
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
        [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }]
    ];
    
    const text = `🔧 <b>Panel d'Administration</b>\n\n` +
                 `👥 Utilisateurs: ${stats.totalUsers}\n` +
                 `📊 Démarrages: ${stats.totalStarts}\n` +
                 `👨‍💼 Admins: ${stats.totalAdmins}\n` +
                 `⏰ Uptime: ${getUptime()}`;
    
    await sendOrEditMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
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
        await sendOrEditPhoto(chatId, image, text, { reply_markup: { inline_keyboard: keyboard } });
    } else {
        await sendOrEditMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
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
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: `service_${serviceType}` }]] } }
        );
        return;
    }
    
    const keyboard = [[{ text: '🔙 Retour', callback_data: `service_${serviceType}` }]];
    
    if (submenu.image) {
        await sendOrEditPhoto(chatId, submenu.image, submenu.text || submenu.name, { reply_markup: { inline_keyboard: keyboard } });
    } else {
        await sendOrEditMessage(chatId, submenu.text || submenu.name, { reply_markup: { inline_keyboard: keyboard } });
    }
}

// Gestion des callbacks
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
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
                
            // Autres callbacks admin
            default:
                if (data.startsWith('submenu_') && !data.startsWith('submenu_text_') && !data.startsWith('submenu_photo_')) {
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
            userStates[userId] = { action: 'editing_welcome' };
            await sendOrEditMessage(
                chatId,
                '✏️ <b>Modifier le message d\'accueil</b>\n\n' +
                'Envoyez le nouveau message.\n' +
                'Utilisez {firstname} pour inclure le prénom.\n\n' +
                '<i>💡 Formatage HTML supporté :</i>\n' +
                '<b>gras</b>, <i>italique</i>, <u>souligné</u>\n' +
                '<s>barré</s>, <code>code</code>, <pre>préformaté</pre>\n' +
                '<a href="https://example.com">lien</a>',
                { reply_markup: { inline_keyboard: [[{ text: '❌ Annuler', callback_data: 'admin_back' }]] } }
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
                { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: 'admin_back' }]] } }
            );
            break;
            
        case 'admin_services':
            await showServicesManagement(chatId);
            break;
            
        case 'edit_pos':
        case 'edit_liv':
        case 'edit_meet':
            const serviceType = data.replace('edit_', '');
            await showServiceEdit(chatId, serviceType);
            break;
            
        case 'submenus_pos':
        case 'submenus_liv':
        case 'submenus_meet':
            const service = data.replace('submenus_', '');
            await showSubmenusManagement(chatId, service);
            break;
            
        default:
            // Gérer les callbacks des sous-menus
            if (data.startsWith('edit_submenu_')) {
                const parts = data.split('_');
                const service = parts[2];
                const submenuId = parts[3];
                await showSubmenuEdit(chatId, service, submenuId);
            } else if (data.startsWith('submenu_text_')) {
                const parts = data.split('_');
                const service = parts[2];
                const submenuId = parts[3];
                userStates[userId] = { action: 'editing_submenu_text', service, submenuId };
                await sendOrEditMessage(
                    chatId, 
                    '📝 <b>Modifier le texte du sous-menu</b>\n\n' +
                    'Envoyez le nouveau texte avec formatage HTML :\n' +
                    '<b>gras</b>, <i>italique</i>, <u>souligné</u>, <s>barré</s>, <code>code</code>',
                    { reply_markup: { inline_keyboard: [[{ text: '❌ Annuler', callback_data: `edit_submenu_${service}_${submenuId}` }]] } }
                );
            } else if (data.startsWith('submenu_photo_')) {
                const parts = data.split('_');
                const service = parts[2];
                const submenuId = parts[3];
                userStates[userId] = { action: 'editing_submenu_photo', service, submenuId };
                await sendOrEditMessage(
                    chatId, 
                    '🖼️ <b>Modifier la photo du sous-menu</b>\n\nEnvoyez la nouvelle photo :',
                    { reply_markup: { inline_keyboard: [[{ text: '❌ Annuler', callback_data: `edit_submenu_${service}_${submenuId}` }]] } }
                );
            }
    }
}

// Afficher la gestion des services
async function showServicesManagement(chatId) {
    const keyboard = [
        [{ text: '🚚 LIVRAISON', callback_data: 'edit_liv' }],
        [{ text: '📮 POSTAL', callback_data: 'edit_pos' }],
        [{ text: '📍 MEET UP', callback_data: 'edit_meet' }],
        [{ text: '🔙 Retour', callback_data: 'admin_back' }]
    ];
    
    await sendOrEditMessage(
        chatId,
        '🚚 <b>Gérer les Services</b>\n\nSélectionnez un service à configurer:',
        { reply_markup: { inline_keyboard: keyboard } }
    );
}

// Afficher l'édition d'un service
async function showServiceEdit(chatId, service) {
    const serviceNames = {
        'liv': 'LIVRAISON',
        'pos': 'POSTAL', 
        'meet': 'MEET UP'
    };
    
    const keyboard = [
        [{ text: '📝 Texte principal', callback_data: `edit_text_${service}` }],
        [{ text: '🖼️ Photo principale', callback_data: `edit_photo_${service}` }],
        [{ text: '📋 Gérer sous-menus', callback_data: `submenus_${service}` }],
        [{ text: '🔙 Retour', callback_data: 'admin_services' }]
    ];
    
    await sendOrEditMessage(
        chatId,
        `✏️ <b>SERVICE ${serviceNames[service]}</b>\n\nQue voulez-vous modifier ?`,
        { reply_markup: { inline_keyboard: keyboard } }
    );
}

// Afficher la gestion des sous-menus
async function showSubmenusManagement(chatId, service) {
    const serviceNames = {
        'liv': 'LIVRAISON',
        'pos': 'POSTAL',
        'meet': 'MEET UP'
    };
    
    const serviceFields = {
        'liv': 'livraisonSubmenus',
        'pos': 'postalSubmenus',
        'meet': 'meetupSubmenus'
    };
    
    const submenus = config[serviceFields[service]] || [];
    const keyboard = [];
    
    submenus.forEach(submenu => {
        keyboard.push([{
            text: `${submenu.name} ${submenu.image ? '🖼️' : ''}`,
            callback_data: `edit_submenu_${service}_${submenu.id}`
        }]);
    });
    
    keyboard.push(
        [{ text: '➕ Ajouter', callback_data: `add_submenu_${service}` }],
        [{ text: '🔙 Retour', callback_data: `edit_${service}` }]
    );
    
    await sendOrEditMessage(
        chatId, 
        `📂 <b>SOUS-MENUS ${serviceNames[service]}</b>\n\n` +
        `Total : ${submenus.length} sous-menus\n` +
        `Cliquez sur un sous-menu pour le modifier.`,
        { reply_markup: { inline_keyboard: keyboard } }
    );
}

// Afficher l'édition d'un sous-menu
async function showSubmenuEdit(chatId, service, submenuId) {
    const serviceFields = {
        'liv': 'livraisonSubmenus',
        'pos': 'postalSubmenus',
        'meet': 'meetupSubmenus'
    };
    
    const submenus = config[serviceFields[service]] || [];
    const submenu = submenus.find(s => s.id === submenuId);
    
    if (!submenu) {
        await sendOrEditMessage(chatId, '❌ Sous-menu non trouvé');
        return;
    }
    
    const keyboard = [
        [{ text: '✏️ Modifier le nom', callback_data: `submenu_name_${service}_${submenuId}` }],
        [{ text: '📝 Modifier le texte', callback_data: `submenu_text_${service}_${submenuId}` }],
        [{ text: '🖼️ Modifier la photo', callback_data: `submenu_photo_${service}_${submenuId}` }],
        [{ text: '🗑️ Supprimer', callback_data: `delete_submenu_${service}_${submenuId}` }],
        [{ text: '🔙 Retour', callback_data: `submenus_${service}` }]
    ];
    
    await sendOrEditMessage(
        chatId,
        `📋 <b>${submenu.name}</b>\n\n` +
        `Service: ${service.toUpperCase()}\n` +
        `Position: ${submenu.position || 0}`,
        { reply_markup: { inline_keyboard: keyboard } }
    );
}

// Gestion des messages texte
bot.on('message', async (msg) => {
    if (msg.text && (msg.text.startsWith('/start') || msg.text.startsWith('/admin'))) {
        return; // Ignorer les commandes
    }
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userState = userStates[userId];
    
    if (!userState) return;
    
    // Gestion du message d'accueil
    if (userState.action === 'editing_welcome') {
        // Formater le texte pour supporter HTML
        const formattedText = formatText(msg.text);
        config.welcomeMessage = formattedText;
        await saveConfig(config);
        delete userStates[userId];
        
        await sendOrEditMessage(
            chatId,
            '✅ Message d\'accueil mis à jour !\n\n<i>Le formatage HTML est supporté :</i>\n<b>gras</b>, <i>italique</i>, <u>souligné</u>, <s>barré</s>, <code>code</code>',
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: 'admin_back' }]] } }
        );
    }
    
    // Gestion de l'édition du texte des sous-menus
    if (userState.action === 'editing_submenu_text') {
        const field = userState.service === 'liv' ? 'livraisonSubmenus' : 
                     userState.service === 'pos' ? 'postalSubmenus' : 'meetupSubmenus';
        
        const submenu = config[field].find(s => s.id === userState.submenuId);
        if (submenu) {
            // Formater le texte pour supporter HTML
            const formattedText = formatText(msg.text);
            submenu.text = formattedText;
            await saveConfig(config);
        }
        
        delete userStates[userId];
        await sendOrEditMessage(
            chatId, 
            '✅ Texte du sous-menu mis à jour !\n\n<i>Le formatage HTML est supporté :</i>\n<b>gras</b>, <i>italique</i>, <u>souligné</u>, <s>barré</s>, <code>code</code>',
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: `edit_submenu_${userState.service}_${userState.submenuId}` }]] } }
        );
    }
});

// Gestion des photos
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userState = userStates[userId];
    
    if (!userState) return;
    
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;
    
    // Gestion de l'édition de photo d'accueil
    if (userState.action === 'editing_welcome_photo') {
        config.welcomeImage = fileId;
        await saveConfig(config);
        delete userStates[userId];
        
        await sendOrEditMessage(
            chatId,
            '✅ Photo d\'accueil mise à jour !',
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: 'admin_back' }]] } }
        );
    }
    
    // Gestion de l'édition de photo des sous-menus
    if (userState.action === 'editing_submenu_photo') {
        const field = userState.service === 'liv' ? 'livraisonSubmenus' : 
                     userState.service === 'pos' ? 'postalSubmenus' : 'meetupSubmenus';
        
        const submenu = config[field].find(s => s.id === userState.submenuId);
        if (submenu) {
            submenu.image = fileId;
            await saveConfig(config);
        }
        
        delete userStates[userId];
        await sendOrEditMessage(
            chatId, 
            '✅ Photo du sous-menu mise à jour !',
            { reply_markup: { inline_keyboard: [[{ text: '🔙 Retour', callback_data: `edit_submenu_${userState.service}_${userState.submenuId}` }]] } }
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