# Sécurité et conformité

Ce document décrit les mesures de sécurité et les pratiques de conformité de ProCrèche Solutions.

---

## Table des matières

1. [Aperçu de la sécurité](#aperçu-de-la-sécurité)
2. [Conformité RGPD](#conformité-rgpd)
3. [Chiffrement des données](#chiffrement-des-données)
4. [Vos droits en matière de confidentialité](#vos-droits-en-matière-de-confidentialité)
5. [Conseils de sécurité du compte](#conseils-de-sécurité-du-compte)
6. [API et intégrations](#api-et-intégrations)

---

## Aperçu de la sécurité

ProCrèche Solutions prend la sécurité de vos données très au sérieux.

### Nos engagements

| Aspect | Notre engagement |
|--------|------------------|
| 🔒 **Chiffrement** | Toutes les données sont chiffrées en transit et au repos |
| 🔐 **Authentification** | Système d'authentification sécurisé |
| 🛡️ **Hébergement** | Serveurs sécurisés avec protection DDoS |
| 📊 **Monitoring** | Surveillance continue des menaces |
| 🔄 **Sauvegardes** | Sauvegardes régulières et redondantes |

### Certifications et conformité

- ✅ Conformité RGPD
- ✅ Hébergement conforme aux normes suisses
- ✅ Protocoles de sécurité modernes

---

## Conformité RGPD

### Qu'est-ce que le RGPD ?

Le **Règlement Général sur la Protection des Données** (RGPD) est un règlement européen qui protège les données personnelles des individus.

### Notre conformité

| Exigence | Comment nous y répondons |
|----------|--------------------------|
| **Consentement** | Consentement explicite lors de l'inscription |
| **Transparence** | Politique de confidentialité claire |
| **Accès aux données** | Vous pouvez exporter vos données |
| **Droit à l'oubli** | Suppression de compte disponible |
| **Portabilité** | Export de données en format standard |
| **Protection** | Mesures techniques et organisationnelles |

### Vos droits RGPD

En tant qu'utilisateur, vous avez le droit de :

1. **Accéder** à vos données personnelles
2. **Rectifier** les informations incorrectes
3. **Supprimer** vos données (droit à l'oubli)
4. **Porter** vos données vers un autre service
5. **Limiter** le traitement de vos données
6. **Vous opposer** à certains traitements
7. **Être informé** en cas de violation de données

---

## Chiffrement des données

### En transit

| Protocole | Description |
|-----------|-------------|
| **TLS 1.3** | Dernière version du protocole de sécurité |
| **HTTPS** | Toutes les connexions sont chiffrées |
| **HSTS** | Protection contre les attaques de rétrogradation |

### Au repos

| Mesure | Description |
|--------|-------------|
| **AES-256** | Chiffrement fort des données stockées |
| **Hachage** | Mots de passe hashés (non réversible) |
| **Isolation** | Séparation des données entre utilisateurs |

### Paiements

| Mesure | Description |
|--------|-------------|
| **PCI-DSS** | Conformité aux normes de paiement |
| **Tokenisation** | Données de carte jamais stockées directement |
| **Processeur tiers** | Paiements gérés par des partenaires certifiés |

---

## Vos droits en matière de confidentialité

### Accéder à vos données

1. Allez dans **Paramètres** → **Confidentialité et données**
2. Cliquez sur **"Exporter mes données"**
3. Confirmez la demande
4. Recevez un lien de téléchargement par email

### Ce qui est inclus dans l'export

- Informations de profil
- Messages (vos messages uniquement)
- Historique d'activité
- Paramètres et préférences

### Supprimer vos données

1. Allez dans **Paramètres** → **Confidentialité et données**
2. Cliquez sur **"Supprimer mon compte"**
3. Confirmez en tapant "SUPPRIMER"
4. Votre compte sera supprimé sous 30 jours

> ⚠️ **Attention :** La suppression est irréversible après 30 jours.

### Données conservées après suppression

Certaines données peuvent être conservées pour des raisons légales :
- Factures et transactions (obligations fiscales)
- Logs de sécurité (détection de fraude)
- Messages (anonymisés, pour la continuité des conversations)

---

## Conseils de sécurité du compte

### Mot de passe sécurisé

| Bonne pratique | Explication |
|----------------|-------------|
| ✅ **8+ caractères** | Plus c'est long, plus c'est sûr |
| ✅ **Mélangez les types** | Majuscules, minuscules, chiffres, symboles |
| ✅ **Unique** | Ne réutilisez pas vos mots de passe |
| ✅ **Gestionnaire** | Utilisez un gestionnaire de mots de passe |
| ❌ **Informations personnelles** | Évitez noms, dates de naissance |
| ❌ **Mots du dictionnaire** | Évitez les mots simples |

### Protéger votre compte

| Action | Pourquoi |
|--------|----------|
| 🔐 **Mot de passe unique** | Limite les dégâts en cas de fuite |
| 📧 **Email sécurisé** | Protégez aussi votre email |
| 🚪 **Déconnexion** | Toujours sur appareils partagés |
| 🔔 **Notifications** | Activez les alertes de sécurité |
| 🔄 **Mises à jour** | Gardez navigateur et OS à jour |

### Reconnaître le phishing

**Attention aux emails suspects :**
- Demandes de mot de passe par email (jamais légitime)
- Liens vers des sites similaires mais différents
- Urgence excessive ("Votre compte sera fermé")
- Fautes d'orthographe et mise en page étrange

**En cas de doute :**
1. Ne cliquez pas sur les liens
2. Accédez au site directement via votre navigateur
3. Contactez le support si nécessaire

---

## API et intégrations

### Pour les développeurs

Si vous intégrez des services tiers :

| Aspect | Recommandation |
|--------|----------------|
| **Authentification** | Utilisez OAuth 2.0 |
| **Tokens** | Gardez vos clés API secrètes |
| **Permissions** | Limitez au minimum nécessaire |
| **Logs** | Surveillez l'utilisation |

### Intégrations tierces

Les intégrations (comme Calendly pour les réservations) sont :
- Optionnelles
- Soumises aux conditions du service tiers
- À votre propre responsabilité

---

## Signaler un problème de sécurité

### Vulnérabilité découverte

Si vous découvrez une faille de sécurité :

1. **Ne l'exploitez pas**
2. **Contactez-nous immédiatement** via le support
3. Sélectionnez "Sécurité" comme catégorie
4. Décrivez la vulnérabilité en détail
5. Nous vous répondrons rapidement

### Compte compromis

Si vous pensez que votre compte a été compromis :

1. **Changez votre mot de passe immédiatement**
2. Vérifiez vos informations de profil
3. Vérifiez les activités récentes
4. Contactez le support
5. Changez aussi le mot de passe de votre email

---

## Questions fréquentes

**Q : Mes données sont-elles vendues à des tiers ?**
R : Non, jamais. Vos données ne sont pas vendues ni partagées à des fins publicitaires.

**Q : Où sont hébergées mes données ?**
R : Nos serveurs sont situés en Europe, conformément au RGPD.

**Q : Combien de temps mes données sont-elles conservées ?**
R : Tant que votre compte est actif, plus 30 jours après suppression.

**Q : Puis-je demander une copie de mes données ?**
R : Oui, via **Paramètres** → **Confidentialité** → **Exporter**.

**Q : Que se passe-t-il en cas de violation de données ?**
R : Nous vous notifierons dans les 72 heures conformément au RGPD.

---

## Documents associés

- 📜 Politique de confidentialité (lien dans le pied de page)
- 📜 Conditions d'utilisation (lien dans le pied de page)
- 📜 Politique de cookies (lien dans le pied de page)

---

## Besoin de plus d'aide ?

- ❓ [Dépannage et FAQ](./10-troubleshooting-faq.md)
- 🎫 Créez un ticket de support (catégorie : Sécurité)

---

*Dernière mise à jour : Janvier 2025*
