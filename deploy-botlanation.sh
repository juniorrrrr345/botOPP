#!/bin/bash

# Script de déploiement vers GitHub botlanation
# Usage: ./deploy-botlanation.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement vers GitHub botlanation${NC}"

# Vérifier que git est installé
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git n'est pas installé${NC}"
    exit 1
fi

# Créer le dossier de déploiement
echo -e "${YELLOW}📁 Création du dossier de déploiement...${NC}"
mkdir -p ../botlanation-github
cd ../botlanation-github

# Initialiser le repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📥 Initialisation du repository...${NC}"
    git init
    git remote add origin https://github.com/juniorrrrr345/botlanation.git
else
    echo -e "${YELLOW}🔄 Repository existant trouvé...${NC}"
fi

# Copier les fichiers du bot Telegram
echo -e "${YELLOW}📋 Copie des fichiers bot Telegram...${NC}"
cp -r ../telegram-bot/* .

# Créer le README principal
echo -e "${YELLOW}📝 Création du README...${NC}"
cat > README.md << 'EOF'
# 🤖 Bot Telegram LANATION

Bot Telegram pour LA NATION DU LAIT avec gestion des services (Livraison, Postal, Meet Up) et support du formatage HTML.

## ✨ Fonctionnalités

- ✅ Support du formatage HTML (gras, italique, souligné, etc.)
- ✅ Gestion des sous-menus (texte et photos) **CORRIGÉ**
- ✅ Services : Livraison, Postal, Meet Up
- ✅ Mini Application intégrée
- ✅ Réseaux sociaux configurables
- ✅ Panel d'administration complet
- ✅ Base de données MongoDB
- ✅ Gestion des utilisateurs et admins

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/juniorrrrr345/botlanation.git
cd botlanation
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer le fichier .env avec vos tokens
```

4. **Démarrer le bot**
```bash
npm start
```

## 📋 Variables d'environnement

```env
BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=your_admin_telegram_id
MONGODB_URI=your_mongodb_connection_string
```

## 🎯 Formatage HTML supporté

- `<b>gras</b>`
- `<i>italique</i>`
- `<u>souligné</u>`
- `<s>barré</s>`
- `<code>code</code>`
- `<pre>préformaté</pre>`
- `<a href="url">lien</a>`

## 🔧 Commandes

- `/start` - Démarrer le bot
- `/admin` - Panel d'administration

## 📊 Déploiement VPS

Le bot est conçu pour fonctionner avec PM2 sur VPS :

```bash
pm2 start bot.js --name LANATION
pm2 save
pm2 startup
```

## 🐛 Corrections apportées

- ✅ **Correction de l'édition des sous-menus** (texte et photos)
- ✅ **Support du formatage HTML** complet
- ✅ **Gestion d'erreurs améliorée**
- ✅ **Stabilité MongoDB**
- ✅ **Interface d'administration optimisée**

## 🔧 Problèmes corrigés

### Édition des sous-menus
- ✅ Modification du texte des sous-menus
- ✅ Modification des photos des sous-menus
- ✅ Modification des noms des sous-menus
- ✅ Interface d'administration intuitive

### Formatage HTML
- ✅ Support complet du formatage Telegram
- ✅ Échappement automatique des caractères spéciaux
- ✅ Validation du HTML avant envoi

### Stabilité
- ✅ Gestion d'erreurs MongoDB améliorée
- ✅ Connexion robuste à la base de données
- ✅ Gestion des timeouts et reconnexions

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.
EOF

# Ajouter tous les fichiers
echo -e "${YELLOW}📤 Ajout des fichiers au git...${NC}"
git add .

# Commit avec message descriptif
echo -e "${YELLOW}💾 Commit des modifications...${NC}"
git commit -m "🤖 Bot Telegram LANATION v2.0 - Corrections sous-menus et support HTML

✅ Corrections apportées:
- Correction de l'édition des sous-menus (texte et photos)
- Support du formatage HTML (gras, italique, souligné, etc.)
- Gestion d'erreurs améliorée
- Stabilité MongoDB
- Interface d'administration optimisée

🔧 Problèmes corrigés:
- Édition des sous-menus Postal/Livraison/MeetUp
- Formatage HTML complet
- Gestion d'erreurs robuste
- Connexion MongoDB stable"

# Push vers GitHub
echo -e "${YELLOW}🚀 Push vers GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo -e "${BLUE}🔗 Repository: https://github.com/juniorrrrr345/botlanation${NC}"

echo -e "${YELLOW}💡 Prochaines étapes:${NC}"
echo -e "  1. Vérifiez le repository sur GitHub"
echo -e "  2. Testez le bot avec les corrections des sous-menus"
echo -e "  3. Déployez sur votre VPS avec PM2"