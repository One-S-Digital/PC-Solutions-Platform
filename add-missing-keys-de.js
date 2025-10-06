const fs = require('fs');
const path = require('path');

const deTranslationsPath = path.resolve(__dirname, 'frontend/public/locales/de/translation.json');

// Read the current German translation file
const deTranslations = JSON.parse(fs.readFileSync(deTranslationsPath, 'utf8'));

// Add the critical missing keys in German
const criticalMissingKeys = {
  // Messages page
  "messagesPage": {
    "searchPlaceholder": "Gespräche suchen...",
    "filters": {
      "all": "Alle",
      "unread": "Ungelesen"
    },
    "noConversationsFound": "Keine Gespräche gefunden",
    "selectConversationToView": "Wählen Sie ein Gespräch zum Anzeigen",
    "conversationFallbackTitle": "Unbekannter Benutzer",
    "attachFile": "Datei anhängen",
    "addEmoji": "Emoji hinzufügen",
    "typeMessagePlaceholder": "Nachricht eingeben...",
    "unknownUser": "Unbekannter Benutzer",
    "youPrefix": "Sie: ",
    "noMessagesYet": "Noch keine Nachrichten",
    "newGroupButton": "Neue Gruppe",
    "noConversationSelectedTitle": "Kein Gespräch ausgewählt",
    "noConversationSelectedSubtitle": "Wählen Sie ein Gespräch aus der Liste aus, um mit dem Messaging zu beginnen",
    "noConversationsYet": "Noch keine Gespräche"
  },

  // Create group chat modal
  "createGroupChatModal": {
    "error": {
      "minParticipants": "Bitte wählen Sie mindestens 2 Teilnehmer aus"
    },
    "title": "Gruppenchat erstellen",
    "groupNameLabel": "Gruppenname",
    "groupNamePlaceholder": "Gruppenname eingeben...",
    "selectParticipantsLabel": "Teilnehmer auswählen",
    "createButton": "Gruppe erstellen"
  },

  // Order request detail modal
  "orderRequestDetailModal": {
    "title": "Bestelldetails",
    "orderId": "Bestell-ID",
    "date": "Datum",
    "status": "Status",
    "total": "Gesamt",
    "viewDaycareProfile": "Krippenprofil anzeigen",
    "lineItems": "Positionen",
    "product": "Produkt",
    "quantity": "Menge",
    "price": "Preis",
    "notes": "Notizen"
  },

  // Service request detail modal
  "serviceRequestDetailModal": {
    "title": "Serviceanfrage-Details",
    "requestId": "Anfrage-ID",
    "serviceName": "Service-Name",
    "viewDaycareProfile": "Krippenprofil anzeigen",
    "date": "Datum",
    "status": "Status",
    "preferredDate": "Bevorzugtes Datum",
    "noPreferredDate": "Kein bevorzugtes Datum festgelegt",
    "notes": "Notizen"
  },

  // Service upload modal
  "serviceUploadModal": {
    "editTitle": "Service bearbeiten",
    "addTitle": "Neuen Service hinzufügen",
    "labels": {
      "title": "Service-Titel",
      "description": "Beschreibung",
      "category": "Kategorie",
      "deliveryType": "Lieferart",
      "availability": "Verfügbarkeit",
      "priceInfo": "Preisinformationen",
      "tags": "Tags",
      "image": "Service-Bild"
    },
    "placeholders": {
      "availability": "z.B. Montag-Freitag 9-17 Uhr",
      "priceInfo": "z.B. CHF 50/Stunde",
      "tags": "z.B. Beratung, Schulung, Support"
    },
    "imageHelpText": "Laden Sie ein Bild hoch, das Ihren Service repräsentiert"
  },

  // Content upload modal
  "contentUploadModal": {
    "fileUpload": {
      "browse": "Dateien durchsuchen",
      "dragAndDrop": "Dateien hier hineinziehen oder klicken zum Durchsuchen",
      "selected": "Ausgewählt: {{fileName}}"
    },
    "error": {
      "selectFileOrLink": "Bitte wählen Sie eine Datei aus oder geben Sie einen Link ein"
    },
    "contentType": {
      "eLearning": "E-Learning-Inhalt",
      "hrPolicy": "HR-Richtlinie",
      "statePolicy": "Staatsrichtlinie"
    },
    "labels": {
      "descriptionPreview": "Beschreibungsvorschau",
      "description": "Beschreibung",
      "title": "Titel",
      "category": "Kategorie",
      "contentType": "Inhaltstyp",
      "language": "Sprache",
      "duration": "Dauer",
      "lessons": "Anzahl der Lektionen",
      "linkUrl": "Link-URL",
      "accessRoles": "Zugriffsrollen",
      "status": "Status",
      "documentTitle": "Dokumenttitel",
      "fileType": "Dateityp",
      "version": "Version",
      "country": "Land",
      "regionCanton": "Region/Kanton",
      "policyType": "Richtlinientyp",
      "criticality": "Kritikalität",
      "markAsCritical": "Als kritisch markieren",
      "effectiveDate": "Gültigkeitsdatum",
      "externalLink": "Externer Link",
      "uploadFile": "Datei hochladen"
    },
    "placeholders": {
      "duration": "z.B. 2 Stunden",
      "linkUrl": "https://beispiel.com",
      "version": "z.B. 1.0",
      "externalLink": "https://beispiel.com"
    },
    "statusOptions": {
      "draft": "Entwurf",
      "published": "Veröffentlicht",
      "archived": "Archiviert"
    },
    "criticalityOptions": {
      "critical": "Kritisch",
      "normal": "Normal"
    },
    "fileUpload": {
      "eLearningAllowedTypes": "Erlaubt: PDF, MP4, DOC, DOCX",
      "hrPolicyAllowedTypes": "Erlaubt: PDF, DOC, DOCX"
    },
    "buttons": {
      "uploading": "Hochladen...",
      "upload": "Hochladen"
    }
  },

  // Navbar
  "navbar": {
    "toggleNavigation": "Navigation umschalten",
    "goBackPreviousPage": "Zurück zur vorherigen Seite",
    "viewShoppingCart": "Warenkorb anzeigen",
    "newMessages": "Neue Nachrichten",
    "noNewNotifications": "Keine neuen Benachrichtigungen",
    "viewAll": "Alle anzeigen",
    "signOut": "Abmelden"
  },

  // Notifications
  "notifications": {
    "errorTitle": "Fehler"
  },

  // Notifications page
  "notificationsPage": {
    "clearAll": "Alle löschen",
    "emptyState": {
      "title": "Keine Benachrichtigungen",
      "message": "Sie haben noch keine Benachrichtigungen"
    }
  },

  // Order request modal
  "orderRequestModal": {
    "labels": {
      "product": "Produkt",
      "supplier": "Lieferant",
      "quantity": "Menge",
      "notes": "Notizen"
    },
    "placeholders": {
      "notes": "Fügen Sie spezielle Anweisungen hinzu..."
    }
  },

  // Organization profile form
  "organizationProfileForm": {
    "accessDenied": "Zugriff verweigert",
    "title": "Organisationsprofil",
    "subtitle": "Vervollständigen Sie die Profilinformationen Ihrer Organisation",
    "labels": {
      "capacity": "Kapazität",
      "pedagogy": "Pädagogische Erklärung",
      "languages": "Sprachen"
    },
    "placeholders": {
      "pedagogy": "Beschreiben Sie Ihren pädagogischen Ansatz...",
      "languages": "z.B. Englisch, Französisch, Deutsch"
    },
    "helpText": {
      "commaSeparated": "Trennen Sie mehrere Elemente durch Kommas"
    },
    "saveButton": "Profil speichern"
  }
};

// Add the critical missing keys to the translations
Object.keys(criticalMissingKeys).forEach(namespace => {
  if (!deTranslations[namespace]) {
    deTranslations[namespace] = {};
  }
  
  // Merge the new keys
  Object.keys(criticalMissingKeys[namespace]).forEach(key => {
    if (typeof criticalMissingKeys[namespace][key] === 'object') {
      if (!deTranslations[namespace][key]) {
        deTranslations[namespace][key] = {};
      }
      Object.assign(deTranslations[namespace][key], criticalMissingKeys[namespace][key]);
    } else {
      deTranslations[namespace][key] = criticalMissingKeys[namespace][key];
    }
  });
});

// Write the updated German translation file
fs.writeFileSync(deTranslationsPath, JSON.stringify(deTranslations, null, 2));

console.log('✅ Added critical missing translation keys to German locale file');