const mongoose = require('mongoose');

// Schéma de configuration MongoDB
const configSchema = new mongoose.Schema({
    botId: { type: String, default: 'main' },
    welcomeMessage: { type: String, default: '🤖 Bienvenue {firstname} sur notre bot!' },
    welcomeImage: String,
    infoText: { type: String, default: 'ℹ️ Informations sur notre service' },
    miniApp: {
        url: String,
        text: { type: String, default: '🎮 Ouvrir l\'application' }
    },
    socialNetworks: [{
        name: String,
        emoji: String,
        url: String,
        position: { type: Number, default: 0 }
    }],
    socialButtonsPerRow: { type: Number, default: 1 },
    servicesEnabled: { type: Boolean, default: true },
    
    // Services
    livraisonText: { type: String, default: '🚚 SERVICE LIVRAISON\n\nContactez-nous pour vos livraisons' },
    livraisonImage: String,
    livraisonSubmenus: [{
        id: { type: String, default: () => require('uuid').v4() },
        name: String,
        text: String,
        image: String,
        position: { type: Number, default: 0 }
    }],
    
    postalText: { type: String, default: '📮 SERVICE POSTAL\n\nEnvoi de colis et courriers' },
    postalImage: String,
    postalSubmenus: [{
        id: { type: String, default: () => require('uuid').v4() },
        name: String,
        text: String,
        image: String,
        position: { type: Number, default: 0 }
    }],
    
    meetupText: { type: String, default: '📍 SERVICE MEET UP\n\nOrganisation de rencontres' },
    meetupImage: String,
    meetupSubmenus: [{
        id: { type: String, default: () => require('uuid').v4() },
        name: String,
        text: String,
        image: String,
        position: { type: Number, default: 0 }
    }],
    
    lastModified: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const Config = mongoose.model('Config', configSchema);

// Charger la configuration
async function loadConfig() {
    try {
        let config = await Config.findOne({ botId: 'main' });
        
        if (!config) {
            // Créer la configuration par défaut
            config = new Config({
                botId: 'main',
                welcomeMessage: '🥛BIENVENUE CHEZ \n             LA NATION DU LAIT🥛 \n\n👩‍🍳 - Découvre ici le Menu Laitier & toutes les infos pour passer commande \n\n👀 - Épingle le Menu & Active tes notifs pour ne rien louper \n\n✍️ - Écris /start en bas pour actualiser le Menu\n\n👇 - Laisse toi guider par les cases interactifs',
                miniApp: {
                    url: 'https://www.lntdl.store',
                    text: 'LALA MENU 🥛'
                },
                socialNetworks: [
                    {
                        name: 'CANAL PRINCIPAL',
                        emoji: '📲',
                        url: 'https://t.me/LALANATIONDU7LIB',
                        position: 1
                    },
                    {
                        name: 'CONTACT OFFICIEL',
                        emoji: '📞',
                        url: 'https://t.me/lalastandardiste',
                        position: 2
                    },
                    {
                        name: 'LALA DU RIF',
                        emoji: '🇲🇦',
                        url: 'https://t.me/+ru6oYTPiMyVhODZk',
                        position: 3
                    }
                ],
                servicesEnabled: true
            });
            
            await config.save();
        }
        
        return config;
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
        throw error;
    }
}

// Sauvegarder la configuration
async function saveConfig(configData) {
    try {
        await Config.findOneAndUpdate(
            { botId: 'main' },
            { ...configData, lastModified: new Date() },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration:', error);
        throw error;
    }
}

// Réinitialiser la configuration
async function resetConfig() {
    try {
        await Config.deleteOne({ botId: 'main' });
        return await loadConfig();
    } catch (error) {
        console.error('Erreur lors de la réinitialisation de la configuration:', error);
        throw error;
    }
}

module.exports = {
    loadConfig,
    saveConfig,
    resetConfig,
    Config
};