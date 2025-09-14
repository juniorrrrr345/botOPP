# 🤖 Bot Telegram LANATION

Bot Telegram pour LA NATION DU LAIT avec gestion des services (Livraison, Postal, Meet Up) et support du formatage HTML.

## ✨ Fonctionnalités

- ✅ Support du formatage HTML (gras, italique, souligné, etc.)
- ✅ Gestion des sous-menus (texte et photos)
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