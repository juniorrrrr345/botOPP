#!/bin/bash

# Script de déploiement pour le bot LANATION amélioré
# Usage: ./deploy-lanation.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Déploiement du bot LANATION amélioré${NC}"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "bot-lanation-improved.js" ]; then
    echo -e "${RED}❌ Fichier bot-lanation-improved.js non trouvé${NC}"
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
cp bot-lanation-improved.js bot.js

# Redémarrer le bot
echo -e "${YELLOW}🔄 Redémarrage du bot...${NC}"
pm2 restart LANATION

# Vérifier le statut
echo -e "${YELLOW}🔍 Vérification du statut...${NC}"
sleep 3
pm2 show LANATION

echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo -e "${BLUE}📋 Nouvelles fonctionnalités :${NC}"
echo -e "  • Support du formatage HTML (gras, italique, souligné, etc.)"
echo -e "  • Commandes /admin et /config améliorées"
echo -e "  • Gestion d'erreurs améliorée pour la stabilité"
echo -e "  • Affichage des statistiques et configuration"
echo ""
echo -e "${YELLOW}💡 Pour tester :${NC}"
echo -e "  • Utilisez /config pour voir la configuration actuelle"
echo -e "  • Utilisez /admin pour accéder au panel d'administration"
echo -e "  • Les textes supportent maintenant le formatage HTML"
echo ""
echo -e "${BLUE}📊 Pour surveiller :${NC}"
echo -e "  • pm2 logs LANATION"
echo -e "  • pm2 monit"