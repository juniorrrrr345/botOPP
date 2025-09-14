#!/bin/bash

# Script de déploiement vers GitHub pour LANATION V2
# À exécuter sur votre VPS avec vos credentials GitHub

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement vers GitHub LANATIONV2${NC}"

# Vérifier que git est installé
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git n'est pas installé${NC}"
    exit 1
fi

# Aller dans le dossier du bot
cd /opt/multi-bots/LANATION

# Créer un dossier temporaire pour GitHub
mkdir -p /tmp/lanation-github
cd /tmp/lanation-github

# Cloner le repository
echo -e "${YELLOW}📥 Clonage du repository...${NC}"
git clone https://github.com/juniorrrrr345/LANATIONV2.git .

# Copier le bot corrigé
echo -e "${YELLOW}📋 Copie du bot corrigé...${NC}"
cp /opt/multi-bots/LANATION/bot.js telegram-bot/
cp /opt/multi-bots/LANATION/config.js telegram-bot/
cp /opt/multi-bots/LANATION/package.json telegram-bot/
cp /opt/multi-bots/LANATION/.env.example telegram-bot/

# Créer le README du bot
cat > telegram-bot/README.md << 'EOF'
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
git clone https://github.com/juniorrrrr345/LANATIONV2.git
cd LANATIONV2/telegram-bot
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

- ✅ Correction de l'édition des sous-menus (texte et photos)
- ✅ Support du formatage HTML
- ✅ Gestion d'erreurs améliorée
- ✅ Stabilité MongoDB
- ✅ Interface d'administration optimisée
EOF

# Créer le README principal
cat > README.md << 'EOF'
# 🥛 LANATION V2

Repository principal pour LA NATION DU LAIT - Version 2

## 📁 Structure du projet

```
LANATIONV2/
├── telegram-bot/          # 🤖 Bot Telegram
│   ├── bot.js            # Bot principal avec corrections
│   ├── config.js         # Configuration MongoDB
│   ├── package.json      # Dépendances Node.js
│   ├── .env.example      # Variables d'environnement
│   └── README.md         # Documentation bot
├── boutique-vercel/      # 🛒 Boutique Vercel
│   └── (fichiers boutique)
└── README.md             # 📖 Documentation principale
```

## 🤖 Bot Telegram

Le bot Telegram LANATION permet de gérer :
- ✅ Services (Livraison, Postal, Meet Up)
- ✅ Sous-menus avec édition (texte et photos) **CORRIGÉ**
- ✅ Formatage HTML (gras, italique, souligné, etc.)
- ✅ Mini Application intégrée
- ✅ Réseaux sociaux configurables
- ✅ Panel d'administration complet

### 🔧 Corrections apportées

- ✅ **Correction de l'édition des sous-menus** (texte et photos)
- ✅ **Support du formatage HTML** complet
- ✅ **Gestion d'erreurs améliorée**
- ✅ **Stabilité MongoDB**
- ✅ **Interface d'administration optimisée**

## 🛒 Boutique Vercel

Boutique en ligne hébergée sur Vercel.

## 🚀 Déploiement

### Bot Telegram sur VPS

```bash
cd telegram-bot
npm install
cp .env.example .env
# Configurer le fichier .env
pm2 start bot.js --name LANATION
```

### Boutique Vercel

```bash
cd boutique-vercel
npm install
vercel deploy
```

## 🔗 Liens utiles

- [Bot Telegram](telegram-bot/README.md)
- [Boutique Vercel](boutique-vercel/README.md)

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

📁 Structure:
- telegram-bot/ : Bot Telegram avec corrections
- boutique-vercel/ : Boutique Vercel
- README.md : Documentation principale"

# Push vers GitHub
echo -e "${YELLOW}🚀 Push vers GitHub...${NC}"
echo -e "${RED}⚠️  ATTENTION: Vous devez configurer vos credentials GitHub${NC}"
echo -e "${YELLOW}💡 Options:${NC}"
echo -e "  1. git config --global user.name 'VotreNom'"
echo -e "  2. git config --global user.email 'votre@email.com'"
echo -e "  3. git config --global credential.helper store"
echo -e "  4. git push origin main"
echo -e ""
echo -e "${BLUE}🔗 Repository: https://github.com/juniorrrrr345/LANATIONV2${NC}"

echo -e "${GREEN}✅ Préparation terminée !${NC}"
echo -e "${YELLOW}💡 Prochaines étapes:${NC}"
echo -e "  1. Configurez vos credentials GitHub"
echo -e "  2. Exécutez: git push origin main"
echo -e "  3. Vérifiez le repository sur GitHub"