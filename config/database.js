// ════════════════════════════════════════════════════════════════
//  config/database.js — Connexion à MongoDB
//
//  Ce fichier gère la connexion entre votre application Node.js
//  et la base de données MongoDB.
//
//  Mongoose = l'outil qui fait le lien entre Node.js et MongoDB.
//  Il permet de définir des "modèles" (structure des données)
//  et de faire des requêtes en JavaScript simple.
// ════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  try {
    // Tentative de connexion avec l'URI du fichier .env
    const connexion = await mongoose.connect(process.env.MONGODB_URI);

    // Si ça réussit, on affiche l'adresse du serveur MongoDB
    logger.info(`✅ MongoDB connecté : ${connexion.connection.host}`);

  } catch (erreur) {
    // Si ça échoue (MongoDB pas démarré, URI incorrecte...)
    logger.error(`❌ Impossible de se connecter à MongoDB !`);
    logger.error(`   Erreur : ${erreur.message}`);
    logger.error(`   Vérifiez que MongoDB est bien démarré sur votre ordinateur.`);
    logger.error(`   URI utilisée : ${process.env.MONGODB_URI}`);

    // On arrête le serveur — inutile de continuer sans base de données
    process.exit(1);
  }
};

// Événements de connexion (informatifs)
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB déconnecté — Le serveur va tenter de se reconnecter...');
});
mongoose.connection.on('reconnected', () => {
  logger.info('🔄 MongoDB reconnecté !');
});

// Fermeture propre quand on arrête le serveur (Ctrl+C)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB fermé proprement. Au revoir !');
  process.exit(0);
});

module.exports = connectDB;
