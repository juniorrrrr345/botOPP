#!/bin/bash

# Script de déploiement vers GitHub pour LANATION V2
# Usage: ./deploy-to-github.sh

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

# Créer le dossier de déploiement
echo -e "${YELLOW}📁 Création du dossier de déploiement...${NC}"
mkdir -p ../lanation-github
cd ../lanation-github

# Cloner ou initialiser le repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📥 Clonage du repository...${NC}"
    git clone https://github.com/juniorrrrr345/LANATIONV2.git .
else
    echo -e "${YELLOW}🔄 Mise à jour du repository...${NC}"
    git pull origin main
fi

# Copier les fichiers du bot Telegram
echo -e "${YELLOW}📋 Copie des fichiers bot Telegram...${NC}"
cp -r ../workspace/telegram-bot/* telegram-bot/

# Créer le README principal
echo -e "${YELLOW}📝 Création du README principal...${NC}"
cp ../workspace/README.md .

# Créer le dossier boutique-vercel s'il n'existe pas
echo -e "${YELLOW}📁 Création du dossier boutique...${NC}"
mkdir -p boutique-vercel
if [ ! -f "boutique-vercel/README.md" ]; then
    cat > boutique-vercel/README.md << 'EOF'
# 🛒 Boutique LANATION Vercel

Boutique en ligne pour LA NATION DU LAIT hébergée sur Vercel.

## 🚀 Déploiement

```bash
npm install
vercel deploy
```

## 📋 Fonctionnalités

- Interface e-commerce moderne
- Gestion des produits
- Paiements intégrés
- Responsive design
EOF
fi

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
git push origin main

echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo -e "${BLUE}🔗 Repository: https://github.com/juniorrrrr345/LANATIONV2${NC}"
echo -e "${BLUE}📋 Bot Telegram: https://github.com/juniorrrrr345/LANATIONV2/tree/main/telegram-bot${NC}"
echo -e "${BLUE}🛒 Boutique Vercel: https://github.com/juniorrrrr345/LANATIONV2/tree/main/boutique-vercel${NC}"

echo -e "${YELLOW}💡 Prochaines étapes:${NC}"
echo -e "  1. Vérifiez le repository sur GitHub"
echo -e "  2. Testez le bot avec les corrections des sous-menus"
echo -e "  3. Déployez la boutique Vercel si nécessaire"