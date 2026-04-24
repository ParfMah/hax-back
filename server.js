// ════════════════════════════════════════════════════════════════
//  server.js — Point d'entrée du backend HaxFinance
//
//  C'est le PREMIER fichier exécuté quand vous tapez "npm run dev".
//  Il configure Express et démarre le serveur HTTP.
//
//  Pour lancer : npm run dev
//  Pour tester : ouvrez http://localhost:5000/api/health
// ════════════════════════════════════════════════════════════════

// ── Étape 1 : Charger les variables du fichier .env ──────────
// DOIT être la toute première ligne (avant les autres imports)
require('dotenv').config();

// ── Étape 2 : Importer les modules nécessaires ───────────────
const express       = require('express');
const cors          = require('cors');          // Autorise le frontend à appeler l'API
const helmet        = require('helmet');        // Ajoute des protections de sécurité HTTP
const mongoSanitize = require('express-mongo-sanitize'); // Protège MongoDB des injections

// Nos propres modules
const connectDB                  = require('./config/database');
const { verifierConnexionEmail } = require('./config/email');
const { limiteGenerale }         = require('./middleware/rateLimiter');
const loanRoutes                 = require('./routes/loanRoutes');
const adminRoutes                = require('./routes/adminRoutes');
const logger                     = require('./utils/logger');

// ── Étape 3 : Créer l'application Express ───────────────────
const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ════════════════════════════════════════════════════════════════
//  MIDDLEWARES DE SÉCURITÉ
//  Un "middleware" = une fonction qui s'exécute sur CHAQUE requête
//  avant d'arriver à la route finale.
// ════════════════════════════════════════════════════════════════

// Protection des headers HTTP (contre XSS, clickjacking, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS : définit quels sites peuvent appeler votre API
// Sans ça, le navigateur bloquerait les appels depuis votre frontend
const originesAutorisees = (process.env.CORS_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser aussi les appels sans origine (Postman, curl...)
    if (!origin) return callback(null, true);
    if (originesAutorisees.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🚫 CORS bloqué — Origine refusée : ${origin}`);
      callback(new Error(`Origine non autorisée : ${origin}`));
    }
  },
  methods:        ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  credentials:    true,
}));

// Limite générale : max 100 requêtes/minute par IP (protection bots)
app.use('/api', limiteGenerale);

// Lecture du JSON dans le corps des requêtes (max 10 Ko)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Supprime les caractères dangereux pour MongoDB (ex: { "$gt": "" })
app.use(mongoSanitize());

// ════════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════════

// Route de santé — pour vérifier que le serveur tourne
// Testez dans votre navigateur : http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    statut:        'OK ✅',
    service:       'HaxFinance API',
    version:       '1.0.0',
    environnement: process.env.NODE_ENV || 'development',
    message:       'Le serveur fonctionne parfaitement !',
    timestamp:     new Date().toISOString(),
  });
});

// Toutes les routes de prêt (définies dans routes/loanRoutes.js)
app.use('/api', loanRoutes);
app.use('/api', adminRoutes);

// ════════════════════════════════════════════════════════════════
//  GESTION DES ERREURS
// ════════════════════════════════════════════════════════════════

// Route inconnue → réponse 404 claire
app.use((req, res) => {
  res.status(404).json({
    succes:  false,
    message: `Route introuvable : ${req.method} ${req.path}`,
    conseil: 'Vérifiez l\'URL. Routes disponibles : POST /api/loan-request, GET /api/health',
  });
});

// Erreur générale → réponse 500 (le "next" à 4 args = gestionnaire d'erreurs pour Express)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ succes: false, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ succes: false, message: 'JSON invalide dans la requête' });
  }
  logger.error(`Erreur non gérée : ${err.message}`);
  res.status(500).json({
    succes:  false,
    message: 'Erreur interne du serveur. Regardez les logs pour plus de détails.',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

// ════════════════════════════════════════════════════════════════
//  DÉMARRAGE
//  On se connecte d'abord à MongoDB, PUIS on ouvre le port HTTP
// ════════════════════════════════════════════════════════════════
const demarrer = async () => {
  // 1. Connexion à la base de données (obligatoire avant tout)
  await connectDB();

  // 2. Vérification de l'email (pas bloquant si ça échoue)
  await verifierConnexionEmail();

  // 3. Démarrage du serveur
  app.listen(PORT, () => {
    // Ce message s'affiche dans votre terminal quand tout est prêt
    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  🚀 HaxFinance API démarrée avec succès !');
    console.log('═══════════════════════════════════════════════');
    console.log(`  📡 Serveur     : http://localhost:${PORT}`);
    console.log(`  💚 Health      : http://localhost:${PORT}/api/health`);
    console.log(`  📨 API POST    : http://localhost:${PORT}/api/loan-request`);
    console.log(`  🌿 Mode        : ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════════');
    console.log('  Appuyez sur Ctrl+C pour arrêter le serveur');
    console.log('\n');
  });
};

// Capture les erreurs de promesses non gérées (sécurité supplémentaire)
process.on('unhandledRejection', (raison) => {
  logger.error(`Erreur non capturée : ${raison}`);
});

// Lancer !
demarrer();
