const fs = require('fs');
const path = require('path');

// Read the current English translation file
const enTranslations = JSON.parse(fs.readFileSync('/workspace/frontend/public/locales/en/translation.json', 'utf8'));

// Function to set a nested key in an object
function setNestedKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Add the most critical missing keys
const criticalMissingKeys = {
  // Messages page
  "messagesPage": {
    "searchPlaceholder": "Search conversations...",
    "filters": {
      "all": "All",
      "unread": "Unread"
    },
    "noConversationsFound": "No conversations found",
    "selectConversationToView": "Select a conversation to view",
    "conversationFallbackTitle": "Unknown User",
    "attachFile": "Attach file",
    "addEmoji": "Add emoji",
    "typeMessagePlaceholder": "Type a message...",
    "unknownUser": "Unknown User",
    "youPrefix": "You: ",
    "noMessagesYet": "No messages yet",
    "newGroupButton": "New Group",
    "noConversationSelectedTitle": "No conversation selected",
    "noConversationSelectedSubtitle": "Choose a conversation from the list to start messaging",
    "noConversationsYet": "No conversations yet"
  },

  // Create group chat modal
  "createGroupChatModal": {
    "error": {
      "minParticipants": "Please select at least 2 participants"
    },
    "title": "Create Group Chat",
    "groupNameLabel": "Group Name",
    "groupNamePlaceholder": "Enter group name...",
    "selectParticipantsLabel": "Select Participants",
    "createButton": "Create Group"
  },

  // Order request detail modal
  "orderRequestDetailModal": {
    "title": "Order Details",
    "orderId": "Order ID",
    "date": "Date",
    "status": "Status",
    "total": "Total",
    "viewDaycareProfile": "View Daycare Profile",
    "lineItems": "Line Items",
    "product": "Product",
    "quantity": "Quantity",
    "price": "Price",
    "notes": "Notes"
  },

  // Service request detail modal
  "serviceRequestDetailModal": {
    "title": "Service Request Details",
    "requestId": "Request ID",
    "serviceName": "Service Name",
    "viewDaycareProfile": "View Daycare Profile",
    "date": "Date",
    "status": "Status",
    "preferredDate": "Preferred Date",
    "noPreferredDate": "No preferred date set",
    "notes": "Notes"
  },

  // Service upload modal
  "serviceUploadModal": {
    "editTitle": "Edit Service",
    "addTitle": "Add New Service",
    "labels": {
      "title": "Service Title",
      "description": "Description",
      "category": "Category",
      "deliveryType": "Delivery Type",
      "availability": "Availability",
      "priceInfo": "Price Information",
      "tags": "Tags",
      "image": "Service Image"
    },
    "placeholders": {
      "availability": "e.g., Monday-Friday 9AM-5PM",
      "priceInfo": "e.g., CHF 50/hour",
      "tags": "e.g., consultation, training, support"
    },
    "imageHelpText": "Upload an image that represents your service"
  },

  // Content upload modal
  "contentUploadModal": {
    "fileUpload": {
      "browse": "Browse Files",
      "dragAndDrop": "Drag and drop files here, or click to browse",
      "selected": "Selected: {{fileName}}"
    },
    "error": {
      "selectFileOrLink": "Please select a file or enter a link"
    },
    "contentType": {
      "eLearning": "E-Learning Content",
      "hrPolicy": "HR Policy",
      "statePolicy": "State Policy"
    },
    "labels": {
      "descriptionPreview": "Description Preview",
      "description": "Description",
      "title": "Title",
      "category": "Category",
      "contentType": "Content Type",
      "language": "Language",
      "duration": "Duration",
      "lessons": "Number of Lessons",
      "linkUrl": "Link URL",
      "accessRoles": "Access Roles",
      "status": "Status",
      "documentTitle": "Document Title",
      "fileType": "File Type",
      "version": "Version",
      "country": "Country",
      "regionCanton": "Region/Canton",
      "policyType": "Policy Type",
      "criticality": "Criticality",
      "markAsCritical": "Mark as Critical",
      "effectiveDate": "Effective Date",
      "externalLink": "External Link",
      "uploadFile": "Upload File"
    },
    "placeholders": {
      "duration": "e.g., 2 hours",
      "linkUrl": "https://example.com",
      "version": "e.g., 1.0",
      "externalLink": "https://example.com"
    },
    "statusOptions": {
      "draft": "Draft",
      "published": "Published",
      "archived": "Archived"
    },
    "criticalityOptions": {
      "critical": "Critical",
      "normal": "Normal"
    },
    "fileUpload": {
      "eLearningAllowedTypes": "Allowed: PDF, MP4, DOC, DOCX",
      "hrPolicyAllowedTypes": "Allowed: PDF, DOC, DOCX"
    },
    "buttons": {
      "uploading": "Uploading...",
      "upload": "Upload"
    }
  },

  // Navbar
  "navbar": {
    "toggleNavigation": "Toggle navigation",
    "goBackPreviousPage": "Go back to previous page",
    "viewShoppingCart": "View shopping cart",
    "newMessages": "New messages",
    "noNewNotifications": "No new notifications",
    "viewAll": "View all",
    "signOut": "Sign out"
  },

  // Notifications
  "notifications": {
    "errorTitle": "Error"
  },

  // Notifications page
  "notificationsPage": {
    "clearAll": "Clear All",
    "emptyState": {
      "title": "No notifications",
      "message": "You don't have any notifications yet"
    }
  },

  // Order request modal
  "orderRequestModal": {
    "labels": {
      "product": "Product",
      "supplier": "Supplier",
      "quantity": "Quantity",
      "notes": "Notes"
    },
    "placeholders": {
      "notes": "Add any special instructions..."
    }
  },

  // Organization profile form
  "organizationProfileForm": {
    "accessDenied": "Access denied",
    "title": "Organization Profile",
    "subtitle": "Complete your organization's profile information",
    "labels": {
      "capacity": "Capacity",
      "pedagogy": "Pedagogy Statement",
      "languages": "Languages"
    },
    "placeholders": {
      "pedagogy": "Describe your educational approach...",
      "languages": "e.g., English, French, German"
    },
    "helpText": {
      "commaSeparated": "Separate multiple items with commas"
    },
    "saveButton": "Save Profile"
  }
};

// Add the critical missing keys to the translations
Object.keys(criticalMissingKeys).forEach(namespace => {
  if (!enTranslations[namespace]) {
    enTranslations[namespace] = {};
  }
  
  // Merge the new keys
  Object.keys(criticalMissingKeys[namespace]).forEach(key => {
    if (typeof criticalMissingKeys[namespace][key] === 'object') {
      if (!enTranslations[namespace][key]) {
        enTranslations[namespace][key] = {};
      }
      Object.assign(enTranslations[namespace][key], criticalMissingKeys[namespace][key]);
    } else {
      enTranslations[namespace][key] = criticalMissingKeys[namespace][key];
    }
  });
});

// Write the updated English translation file
fs.writeFileSync('/workspace/frontend/public/locales/en/translation.json', JSON.stringify(enTranslations, null, 2));

console.log('✅ Added critical missing translation keys to English locale file');
console.log('📝 Added keys for:');
console.log('  - messagesPage');
console.log('  - createGroupChatModal');
console.log('  - orderRequestDetailModal');
console.log('  - serviceRequestDetailModal');
console.log('  - serviceUploadModal');
console.log('  - contentUploadModal');
console.log('  - navbar');
console.log('  - notifications');
console.log('  - notificationsPage');
console.log('  - orderRequestModal');
console.log('  - organizationProfileForm');

console.log('\n🔄 Next steps:');
console.log('1. Add the same keys to French and German locale files');
console.log('2. Test the frontend to see if translation issues are resolved');
console.log('3. Run the scanner again to check for remaining missing keys');