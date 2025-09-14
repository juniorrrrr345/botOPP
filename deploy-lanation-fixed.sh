#!/bin/bash

# Script de déploiement pour le bot LANATION corrigé
# Usage: ./deploy-lanation-fixed.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement du bot LANATION corrigé${NC}"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "bot-lanation-fixed.js" ]; then
    echo -e "${RED}❌ Fichier bot-lanation-fixed.js non trouvé${NC}"
    exit 1
fi

# Arrêter le bot actuel
echo -e "${YELLOW}⏹️ Arrêt du bot actuel...${NC}"
pm2 stop LANATION

# Sauvegarder l'ancien bot
echo -e "${YELLOW}💾 Sauvegarde de l'ancien bot...${NC}"
cp bot.js bot.js.backup_$(date +%Y%m%d_%H%M%S)

# Remplacer par la nouvelle version
echo -e "${YELLOW}📝 Installation de la nouvelle version...${NC}"
cp bot-lanation-fixed.js bot.js

# Redémarrer le bot
echo -e "${YELLOW}🔄 Redémarrage du bot...${NC}"
pm2 restart LANATION

# Vérifier le statut
echo -e "${YELLOW}🔍 Vérification du statut...${NC}"
sleep 3
pm2 show LANATION

echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo -e "${BLUE}📋 Corrections apportées :${NC}"
echo -e "  ✅ Support du formatage HTML (gras, italique, souligné, etc.)"
echo -e "  ✅ Correction de l'édition des sous-menus (texte et photos)"
echo -e "  ✅ Gestion d'erreurs améliorée pour la stabilité"
echo -e "  ✅ Correction des avertissements MongoDB"
echo -e "  ✅ Garde de la structure MongoDB existante"
echo ""
echo -e "${YELLOW}💡 Pour tester :${NC}"
echo -e "  • Utilisez /admin pour accéder au panel d'administration"
echo -e "  • Allez dans 'Gérer Services' → 'POSTAL' → 'Gérer sous-menus'"
echo -e "  • Cliquez sur un sous-menu et testez 'Modifier le texte'"
echo -e "  • Utilisez le formatage HTML : <b>gras</b>, <i>italique</i>, <u>souligné</u>"
echo ""
echo -e "${BLUE}📊 Pour surveiller :${NC}"
echo -e "  • pm2 logs LANATION"
echo -e "  • pm2 monit"