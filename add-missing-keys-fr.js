const fs = require('fs');
const path = require('path');

const frTranslationsPath = path.resolve(__dirname, 'frontend/public/locales/fr/translation.json');

// Read the current French translation file
const frTranslations = JSON.parse(fs.readFileSync(frTranslationsPath, 'utf8'));

// Add the critical missing keys in French
const criticalMissingKeys = {
  // Messages page
  "messagesPage": {
    "searchPlaceholder": "Rechercher des conversations...",
    "filters": {
      "all": "Toutes",
      "unread": "Non lues"
    },
    "noConversationsFound": "Aucune conversation trouvée",
    "selectConversationToView": "Sélectionnez une conversation à afficher",
    "conversationFallbackTitle": "Utilisateur inconnu",
    "attachFile": "Joindre un fichier",
    "addEmoji": "Ajouter un emoji",
    "typeMessagePlaceholder": "Tapez un message...",
    "unknownUser": "Utilisateur inconnu",
    "youPrefix": "Vous : ",
    "noMessagesYet": "Aucun message pour le moment",
    "newGroupButton": "Nouveau groupe",
    "noConversationSelectedTitle": "Aucune conversation sélectionnée",
    "noConversationSelectedSubtitle": "Choisissez une conversation dans la liste pour commencer à échanger des messages",
    "noConversationsYet": "Aucune conversation pour le moment"
  },

  // Create group chat modal
  "createGroupChatModal": {
    "error": {
      "minParticipants": "Veuillez sélectionner au moins 2 participants"
    },
    "title": "Créer un chat de groupe",
    "groupNameLabel": "Nom du groupe",
    "groupNamePlaceholder": "Entrez le nom du groupe...",
    "selectParticipantsLabel": "Sélectionner les participants",
    "createButton": "Créer le groupe"
  },

  // Order request detail modal
  "orderRequestDetailModal": {
    "title": "Détails de la commande",
    "orderId": "ID de commande",
    "date": "Date",
    "status": "Statut",
    "total": "Total",
    "viewDaycareProfile": "Voir le profil de la crèche",
    "lineItems": "Articles",
    "product": "Produit",
    "quantity": "Quantité",
    "price": "Prix",
    "notes": "Notes"
  },

  // Service request detail modal
  "serviceRequestDetailModal": {
    "title": "Détails de la demande de service",
    "requestId": "ID de demande",
    "serviceName": "Nom du service",
    "viewDaycareProfile": "Voir le profil de la crèche",
    "date": "Date",
    "status": "Statut",
    "preferredDate": "Date préférée",
    "noPreferredDate": "Aucune date préférée définie",
    "notes": "Notes"
  },

  // Service upload modal
  "serviceUploadModal": {
    "editTitle": "Modifier le service",
    "addTitle": "Ajouter un nouveau service",
    "labels": {
      "title": "Titre du service",
      "description": "Description",
      "category": "Catégorie",
      "deliveryType": "Type de livraison",
      "availability": "Disponibilité",
      "priceInfo": "Informations sur les prix",
      "tags": "Étiquettes",
      "image": "Image du service"
    },
    "placeholders": {
      "availability": "ex: Lundi-Vendredi 9h-17h",
      "priceInfo": "ex: CHF 50/heure",
      "tags": "ex: consultation, formation, support"
    },
    "imageHelpText": "Téléchargez une image qui représente votre service"
  },

  // Content upload modal
  "contentUploadModal": {
    "fileUpload": {
      "browse": "Parcourir les fichiers",
      "dragAndDrop": "Glissez-déposez les fichiers ici, ou cliquez pour parcourir",
      "selected": "Sélectionné : {{fileName}}"
    },
    "error": {
      "selectFileOrLink": "Veuillez sélectionner un fichier ou entrer un lien"
    },
    "contentType": {
      "eLearning": "Contenu d'apprentissage en ligne",
      "hrPolicy": "Politique RH",
      "statePolicy": "Politique d'état"
    },
    "labels": {
      "descriptionPreview": "Aperçu de la description",
      "description": "Description",
      "title": "Titre",
      "category": "Catégorie",
      "contentType": "Type de contenu",
      "language": "Langue",
      "duration": "Durée",
      "lessons": "Nombre de leçons",
      "linkUrl": "URL du lien",
      "accessRoles": "Rôles d'accès",
      "status": "Statut",
      "documentTitle": "Titre du document",
      "fileType": "Type de fichier",
      "version": "Version",
      "country": "Pays",
      "regionCanton": "Région/Canton",
      "policyType": "Type de politique",
      "criticality": "Criticité",
      "markAsCritical": "Marquer comme critique",
      "effectiveDate": "Date d'entrée en vigueur",
      "externalLink": "Lien externe",
      "uploadFile": "Télécharger un fichier"
    },
    "placeholders": {
      "duration": "ex: 2 heures",
      "linkUrl": "https://exemple.com",
      "version": "ex: 1.0",
      "externalLink": "https://exemple.com"
    },
    "statusOptions": {
      "draft": "Brouillon",
      "published": "Publié",
      "archived": "Archivé"
    },
    "criticalityOptions": {
      "critical": "Critique",
      "normal": "Normal"
    },
    "fileUpload": {
      "eLearningAllowedTypes": "Autorisé : PDF, MP4, DOC, DOCX",
      "hrPolicyAllowedTypes": "Autorisé : PDF, DOC, DOCX"
    },
    "buttons": {
      "uploading": "Téléchargement...",
      "upload": "Télécharger"
    }
  },

  // Navbar
  "navbar": {
    "toggleNavigation": "Basculer la navigation",
    "goBackPreviousPage": "Retour à la page précédente",
    "viewShoppingCart": "Voir le panier",
    "newMessages": "Nouveaux messages",
    "noNewNotifications": "Aucune nouvelle notification",
    "viewAll": "Voir tout",
    "signOut": "Se déconnecter"
  },

  // Notifications
  "notifications": {
    "errorTitle": "Erreur"
  },

  // Notifications page
  "notificationsPage": {
    "clearAll": "Tout effacer",
    "emptyState": {
      "title": "Aucune notification",
      "message": "Vous n'avez pas encore de notifications"
    }
  },

  // Order request modal
  "orderRequestModal": {
    "labels": {
      "product": "Produit",
      "supplier": "Fournisseur",
      "quantity": "Quantité",
      "notes": "Notes"
    },
    "placeholders": {
      "notes": "Ajoutez des instructions spéciales..."
    }
  },

  // Organization profile form
  "organizationProfileForm": {
    "accessDenied": "Accès refusé",
    "title": "Profil de l'organisation",
    "subtitle": "Complétez les informations du profil de votre organisation",
    "labels": {
      "capacity": "Capacité",
      "pedagogy": "Déclaration pédagogique",
      "languages": "Langues"
    },
    "placeholders": {
      "pedagogy": "Décrivez votre approche éducative...",
      "languages": "ex: Anglais, Français, Allemand"
    },
    "helpText": {
      "commaSeparated": "Séparez plusieurs éléments par des virgules"
    },
    "saveButton": "Enregistrer le profil"
  }
};

// Add the critical missing keys to the translations
Object.keys(criticalMissingKeys).forEach(namespace => {
  if (!frTranslations[namespace]) {
    frTranslations[namespace] = {};
  }
  
  // Merge the new keys
  Object.keys(criticalMissingKeys[namespace]).forEach(key => {
    if (typeof criticalMissingKeys[namespace][key] === 'object') {
      if (!frTranslations[namespace][key]) {
        frTranslations[namespace][key] = {};
      }
      Object.assign(frTranslations[namespace][key], criticalMissingKeys[namespace][key]);
    } else {
      frTranslations[namespace][key] = criticalMissingKeys[namespace][key];
    }
  });
});

// Write the updated French translation file
fs.writeFileSync(frTranslationsPath, JSON.stringify(frTranslations, null, 2));

console.log('✅ Added critical missing translation keys to French locale file');