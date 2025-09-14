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
- ✅ Sous-menus avec édition (texte et photos)
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

## 📋 Fonctionnalités

### Bot Telegram
- Commande `/start` - Interface utilisateur
- Commande `/admin` - Panel d'administration
- Gestion des services et sous-menus
- Support HTML pour le formatage
- Base de données MongoDB

### Boutique Vercel
- Interface e-commerce
- Gestion des produits
- Paiements intégrés

## 🔗 Liens utiles

- [Bot Telegram](telegram-bot/README.md)
- [Boutique Vercel](boutique-vercel/README.md)

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.