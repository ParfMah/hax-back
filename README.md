# 🚀 HaxFinance Backend — Guide Débutant Complet

> **Vous ne connaissez rien à Node.js ? Parfait. Ce guide vous emmène de zéro à un serveur opérationnel.**

---

## 📋 Table des matières

1. [Ce que vous allez construire](#1-ce-que-vous-allez-construire)
2. [Ce que vous devez installer](#2-ce-que-vous-devez-installer)
3. [Créer et ouvrir le projet](#3-créer-et-ouvrir-le-projet)
4. [Configurer le fichier .env](#4-configurer-le-fichier-env)
5. [Installer les dépendances](#5-installer-les-dépendances)
6. [Lancer le serveur](#6-lancer-le-serveur)
7. [Tester que ça fonctionne](#7-tester-que-ça-fonctionne)
8. [Connecter le formulaire HTML](#8-connecter-le-formulaire-html)
9. [Comprendre la structure du projet](#9-comprendre-la-structure-du-projet)
10. [Résoudre les problèmes courants](#10-résoudre-les-problèmes-courants)

---

## 1. Ce que vous allez construire

Votre backend va faire exactement ceci :

```
[Formulaire HTML] ──────► [Votre serveur Node.js] ──────► [MongoDB]
       ▲                         │
       │                         ▼
  "Demande            [Email au conseiller]
   envoyée !"         [Email de confirmation]
```

Quand un visiteur soumet le formulaire de prêt :
- ✅ Les données sont **validées** côté serveur
- ✅ La demande est **sauvegardée** dans MongoDB
- ✅ Un **email** est envoyé au conseiller
- ✅ Un **email de confirmation** est envoyé au client
- ✅ Une **référence unique** (ex: HAX-A1B2C3D4E5) est générée

---

## 2. Ce que vous devez installer

### A. Node.js (le moteur JavaScript serveur)

1. Allez sur **https://nodejs.org**
2. Téléchargez la version **LTS** (la plus stable, recommandée)
3. Installez-la normalement (suivez l'assistant)
4. Vérifiez l'installation en ouvrant un terminal et tapant :

```
node --version
```
Vous devez voir quelque chose comme : `v20.11.0`

---

### B. MongoDB (la base de données)

**Option 1 : Installation locale** (pour débutant, tout en local)

1. Allez sur **https://www.mongodb.com/try/download/community**
2. Sélectionnez : Version → Current, Platform → Windows/macOS/Linux, Package → MSI
3. Installez avec les options par défaut
4. MongoDB se lance automatiquement comme service Windows

**Option 2 : MongoDB Atlas** (cloud gratuit, plus simple à long terme)

1. Allez sur **https://cloud.mongodb.com**
2. Créez un compte gratuit
3. Créez un cluster "Free" (M0)
4. Cliquez sur "Connect" → "Drivers" → copiez l'URI de connexion
5. Vous l'utiliserez dans le fichier .env

---

### C. VS Code (l'éditeur de code)

Si vous ne l'avez pas encore : **https://code.visualstudio.com**

Extensions recommandées (recherchez-les dans VS Code → Extensions) :
- **REST Client** — pour tester l'API directement dans VS Code
- **MongoDB for VS Code** — pour voir votre base de données
- **dotenv** — pour la coloration du fichier .env

---

## 3. Créer et ouvrir le projet

### Étape par étape :

**1. Choisissez où mettre votre projet**

Par exemple : `C:\Projets\` (Windows) ou `~/Projets/` (Mac/Linux)

**2. Extrayez le ZIP**

Décompressez le fichier `haxfinance-backend.zip` dans ce dossier.
Vous devez avoir : `C:\Projets\haxfinance-backend\`

**3. Ouvrez dans VS Code**

- Ouvrez VS Code
- Cliquez sur `Fichier` → `Ouvrir le dossier...`
- Sélectionnez le dossier `haxfinance-backend`
- Cliquez sur `Sélectionner le dossier`

**4. Ouvrez le terminal intégré**

Dans VS Code : menu `Terminal` → `Nouveau terminal`

Un panneau noir s'ouvre en bas. C'est votre terminal.
Vous devez voir le chemin de votre projet, ex : `C:\Projets\haxfinance-backend>`

---

## 4. Configurer le fichier .env

Le fichier `.env` contient vos mots de passe et configurations.
Il ne sera JAMAIS partagé (il est dans .gitignore).

**Étape 1 : Créer le fichier .env**

Dans le terminal VS Code, tapez exactement :

```bash
# Sur Windows :
copy .env.example .env

# Sur Mac/Linux :
cp .env.example .env
```

**Étape 2 : Ouvrir .env dans VS Code**

Cliquez sur `.env` dans l'explorateur de fichiers (panneau gauche).

**Étape 3 : Remplir les valeurs**

Voici ce que vous devez modifier :

```env
# ─── MONGODB ───────────────────────────────────────
# Si MongoDB est installé localement (Option 1) :
MONGODB_URI=mongodb://localhost:27017/haxfinance
# ← Ne changez RIEN à cette ligne, ça marche tout seul

# Si vous utilisez MongoDB Atlas (Option 2) :
# MONGODB_URI=mongodb+srv://VOTRE_USER:VOTRE_MDP@cluster0.xxxxx.mongodb.net/haxfinance
# ← Décommentez cette ligne et remplacez avec votre URI Atlas

# ─── EMAIL ─────────────────────────────────────────
EMAIL_USER=votre_vraie_adresse@gmail.com
# ↑ Votre adresse Gmail

EMAIL_PASS=xxxx xxxx xxxx xxxx
# ↑ PAS votre vrai mdp Gmail ! Voir les instructions ci-dessous.

EMAIL_FROM="HaxFinance <votre_vraie_adresse@gmail.com>"
EMAIL_CONSEILLER=votre_vraie_adresse@gmail.com
EMAIL_REPLY_TO=votre_vraie_adresse@gmail.com
```

---

### 📧 Comment créer un "Mot de passe d'application" Gmail

*(Obligatoire car Gmail bloque les connexions directes)*

1. Allez sur **https://myaccount.google.com**
2. Cliquez sur **"Sécurité"** dans le menu gauche
3. Si ce n'est pas fait : activez la **"Validation en 2 étapes"**
4. Une fois activée, recherchez **"Mots de passe des applications"**
5. Dans le menu déroulant, choisissez **"Autre (nom personnalisé)"**
6. Tapez `HaxFinance` comme nom
7. Cliquez sur **"Générer"**
8. Copiez le code généré (16 caractères avec espaces, ex: `abcd efgh ijkl mnop`)
9. Collez-le dans `.env` pour `EMAIL_PASS=`

---

## 5. Installer les dépendances

Dans le terminal VS Code, tapez :

```bash
npm install
```

Cette commande lit `package.json` et télécharge tous les modules nécessaires.
Ça peut prendre 30 secondes à 2 minutes selon votre connexion.

Vous verrez plein de texte défiler. À la fin, vous verrez quelque chose comme :
```
added 312 packages in 45s
```

✅ C'est bon ! Le dossier `node_modules/` a été créé automatiquement.

---

## 6. Lancer le serveur

Dans le terminal VS Code, tapez :

```bash
npm run dev
```

Si tout est bien configuré, vous verrez dans le terminal :

```
═══════════════════════════════════════════════
  🚀 HaxFinance API démarrée avec succès !
═══════════════════════════════════════════════
  📡 Serveur     : http://localhost:5000
  💚 Health      : http://localhost:5000/api/health
  📨 API POST    : http://localhost:5000/api/loan-request
  🌿 Mode        : development
═══════════════════════════════════════════════
  Appuyez sur Ctrl+C pour arrêter le serveur
```

Et aussi :
```
✅ MongoDB connecté : localhost
✅ Email SMTP connecté — Les emails seront envoyés normalement
```

**Le serveur tourne ! Ne fermez pas ce terminal.**

Pour l'arrêter : `Ctrl + C` dans le terminal.

---

## 7. Tester que ça fonctionne

### Test 1 : Dans le navigateur (le plus simple)

Ouvrez votre navigateur (Chrome, Firefox...) et allez sur :

```
http://localhost:5000/api/health
```

Vous devez voir ce texte JSON :
```json
{
  "statut": "OK ✅",
  "service": "HaxFinance API",
  "version": "1.0.0",
  "environnement": "development",
  "message": "Le serveur fonctionne parfaitement !"
}
```

🎉 **Votre API fonctionne !**

---

### Test 2 : Envoyer une vraie demande (avec Postman)

**Installer Postman :**
1. Allez sur **https://www.postman.com/downloads/**
2. Téléchargez et installez

**Importer la collection de tests :**
1. Ouvrez Postman
2. Cliquez sur `Import` (en haut à gauche)
3. Glissez-déposez le fichier `tests/postman_collection.json`
4. La collection "HaxFinance API — Tests" apparaît

**Créer un environnement :**
1. Cliquez sur l'icône ⚙️ en haut à droite → `Environments`
2. Cliquez sur `Add`
3. Nommez-le `Local`
4. Ajoutez la variable : `BASE_URL` = `http://localhost:5000`
5. Sauvegardez

**Lancer les tests :**
1. Sélectionnez l'environnement `Local` (menu déroulant en haut à droite)
2. Dans la collection, cliquez sur `1. ✅ Santé` → `Send`
3. Vous devez voir `200 OK` et le JSON de santé
4. Cliquez sur `2. ✅ Créer une demande VALIDE` → `Send`
5. Vous verrez la réponse avec la référence générée

---

### Test 3 : Voir les données dans MongoDB

Si vous avez installé l'extension **MongoDB for VS Code** :
1. Cliquez sur l'icône MongoDB dans la barre latérale gauche
2. Connectez-vous avec `mongodb://localhost:27017`
3. Naviguez vers `haxfinance` → `loanrequests`
4. Vous verrez vos demandes stockées !

---

## 8. Connecter le formulaire HTML

Maintenant, faites en sorte que votre formulaire HTML envoie les données au backend.

### Étape 1 : Copier le fichier api.js

Copiez `public/js/api.js` (depuis le backend) vers `haxfinance/js/api.js` (dans le frontend).

Structure finale attendue :
```
haxfinance/
  js/
    main.js          ← déjà là
    simulation.js    ← déjà là
    api.js           ← NOUVEAU (à copier depuis le backend)
```

### Étape 2 : Modifier simulation.html

Ouvrez `haxfinance/pages/simulation.html`.
Trouvez la zone des scripts (avant `</body>`) et ajoutez `api.js` EN DERNIER :

```html
  <!-- Avant </body> — ORDRE IMPORTANT -->
  <script src="../js/main.js"></script>
  <script src="../js/simulation.js"></script>
  <script src="../js/api.js"></script>  <!-- ← AJOUTER CETTE LIGNE -->
</body>
```

### Étape 3 : Vérifier que les IDs correspondent

Le fichier `api.js` cherche ces éléments HTML par leur ID.
Vérifiez qu'ils existent bien dans votre `simulation.html` :

| ID dans api.js     | Élément HTML correspondant          |
|--------------------|-------------------------------------|
| `prenom`           | `<input id="prenom">`               |
| `nom`              | `<input id="nom">`                  |
| `email`            | `<input id="email">`                |
| `tel`              | `<input id="tel">`                  |
| `type-pret`        | `<input type="hidden" id="type-pret">` |
| `montant`          | `<input id="montant">`              |
| `duree`            | `<input type="range" id="duree">`   |
| `revenu`           | `<input id="revenu">`               |
| `situation`        | `<select id="situation">`           |
| `message`          | `<textarea id="message">`           |
| `toast`            | `<div id="toast">` (pour le succès) |

### Étape 4 : Tester le formulaire complet

1. Assurez-vous que le backend tourne (`npm run dev`)
2. Ouvrez le frontend avec Live Server dans VS Code
3. Allez sur la page Simulation
4. Remplissez et soumettez le formulaire
5. Vous devez voir le toast de succès avec la référence

---

## 9. Comprendre la structure du projet

```
haxfinance-backend/
│
├── 📄 server.js              ← POINT D'ENTRÉE
│                               Lance tout. C'est ici que commence l'app.
│
├── 📄 .env                   ← VOS SECRETS
│                               Mots de passe, URLs. Ne jamais partager.
│
├── 📄 package.json           ← LA LISTE DES COURSES
│                               Liste toutes les librairies nécessaires.
│
├── 📁 config/
│   ├── database.js           ← Connexion MongoDB
│   └── email.js              ← Connexion SMTP (email)
│
├── 📁 models/
│   └── LoanRequest.js        ← STRUCTURE DES DONNÉES
│                               Définit à quoi ressemble une demande de prêt
│                               dans la base de données.
│
├── 📁 controllers/
│   └── loanController.js     ← LOGIQUE MÉTIER
│                               C'est ici que se passe la vraie magie :
│                               sauvegarder, calculer, envoyer les emails.
│
├── 📁 routes/
│   └── loanRoutes.js         ← L'ANNUAIRE
│                               Connecte les URLs aux contrôleurs.
│                               Ex: "POST /api/loan-request → creerDemande()"
│
├── 📁 middleware/
│   ├── validation.js         ← CONTRÔLE DES DONNÉES
│                               Vérifie que les données reçues sont correctes
│                               avant de les sauvegarder.
│   └── rateLimiter.js        ← PROTECTION ANTI-ABUS
│                               Limite le nombre de requêtes par IP.
│
├── 📁 utils/
│   ├── logger.js             ← SYSTÈME DE LOGS
│                               Remplace console.log, sauvegarde dans des fichiers.
│   └── emailTemplates.js     ← CONTENU DES EMAILS
│                               HTML des emails envoyés au conseiller et au client.
│
├── 📁 public/js/
│   └── api.js                ← CONNECTEUR FRONTEND
│                               À copier dans haxfinance/js/
│                               Fait le lien entre le formulaire HTML et l'API.
│
└── 📁 tests/
    └── postman_collection.json ← TESTS API
                                  Importer dans Postman pour tester toutes les routes.
```

### Le voyage d'une demande de prêt

```
1. Visiteur remplit le formulaire et clique "Envoyer"
        │
        ▼
2. api.js (frontend) envoie fetch("POST /api/loan-request", donnees)
        │
        ▼
3. server.js reçoit la requête
        │
        ▼
4. rateLimiter.js vérifie : "Trop de tentatives depuis cette IP ?"
        │  Non → continuer
        ▼
5. validation.js vérifie : "Tous les champs sont corrects ?"
        │  Oui → continuer
        ▼
6. loanController.js :
   a) Recalcule la mensualité côté serveur
   b) Sauvegarde dans MongoDB (LoanRequest.js)
   c) Envoie email au conseiller (emailTemplates.js)
   d) Envoie email de confirmation au client
        │
        ▼
7. Réponse JSON : { succes: true, reference: "HAX-A1B2C3D4E5" }
        │
        ▼
8. api.js (frontend) affiche le toast de succès
```

---

## 10. Résoudre les problèmes courants

### ❌ "Cannot find module 'express'"
**Cause :** Les dépendances ne sont pas installées.
**Solution :** Tapez `npm install` dans le terminal.

---

### ❌ "MongoServerError: connect ECONNREFUSED"
**Cause :** MongoDB n'est pas démarré.
**Solution Windows :**
```
# Ouvrir PowerShell en administrateur et taper :
net start MongoDB
```
**Solution Mac :**
```bash
brew services start mongodb-community
```
**Solution Linux :**
```bash
sudo systemctl start mongod
```

---

### ❌ "Invalid login: 535 Authentication Failed" (email)
**Cause :** Le mot de passe d'application Gmail est incorrect.
**Solution :**
1. Vérifiez que vous avez bien activé la validation 2 étapes
2. Régénérez un nouveau mot de passe d'application
3. Copiez-le sans les espaces dans EMAIL_PASS

---

### ❌ "CORS Error" dans le navigateur
**Cause :** L'URL de votre frontend n'est pas dans la liste CORS.
**Solution :** Dans votre `.env`, ajoutez l'URL de Live Server :
```env
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```
Redémarrez le serveur (`Ctrl+C` puis `npm run dev`).

---

### ❌ "Port 5000 already in use"
**Cause :** Un autre programme utilise déjà le port 5000.
**Solution :** Dans `.env`, changez le port :
```env
PORT=3001
```
Et dans `api.js` (frontend), changez :
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

---

### ❌ Le formulaire ne s'envoie pas (pas d'erreur visible)
**Cause :** `api.js` n'est pas chargé dans `simulation.html`.
**Solution :** Vérifiez que `<script src="../js/api.js"></script>` est bien présent, APRÈS `simulation.js`.

---

### ❌ "Cannot read properties of null (reading 'value')"
**Cause :** Un ID dans `api.js` ne correspond pas à votre HTML.
**Solution :** Ouvrez la console du navigateur (F12 → Console) pour voir quel ID pose problème. Vérifiez que l'ID existe dans votre `simulation.html`.

---

## 📦 Résumé des commandes

```bash
# Installer les dépendances (une seule fois)
npm install

# Lancer en développement (redémarre auto si vous modifiez le code)
npm run dev

# Lancer en production (ne redémarre pas auto)
npm start
```

## 🌐 URLs disponibles quand le serveur tourne

| URL | Méthode | Description |
|-----|---------|-------------|
| http://localhost:5000/api/health | GET | Vérifier que l'API tourne |
| http://localhost:5000/api/loan-request | POST | Soumettre une demande |
| http://localhost:5000/api/loan-request/HAX-XXXXX | GET | Lire une demande |
| http://localhost:5000/api/loan-requests | GET | Lister toutes les demandes |
| http://localhost:5000/api/loan-requests/stats | GET | Statistiques |

---

*Vous avez un problème non listé ici ? Vérifiez les logs dans le terminal — ils contiennent toujours un message explicatif.*
