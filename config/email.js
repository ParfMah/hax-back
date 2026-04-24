// ════════════════════════════════════════════════════════════════
//  config/email.js — Configuration de l'envoi d'emails
//
//  Nodemailer = la librairie Node.js pour envoyer des emails.
//  On configure ici la connexion au serveur SMTP (Gmail par défaut).
//
//  Un "transporteur" = la connexion au serveur email.
//  On le crée une seule fois ici et on l'utilise partout.
// ════════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

// Création du transporteur SMTP à partir des variables .env
const transporteur = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  // false = connexion normale avec STARTTLS (recommandé sur port 587)
  // true  = connexion SSL directe (pour port 465)
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000, // 5 secondes max pour se connecter
  greetingTimeout:   3000,
});

// Vérifie que la connexion SMTP fonctionne au démarrage du serveur
const verifierConnexionEmail = async () => {
  try {
    await transporteur.verify();
    logger.info('✅ Email SMTP connecté — Les emails seront envoyés normalement');
  } catch (erreur) {
    // On prévient mais on ne bloque PAS le serveur
    // L'API peut fonctionner même si les emails ne partent pas
    logger.warn('⚠️  Email SMTP non connecté — Les emails ne seront pas envoyés');
    logger.warn(`   Raison : ${erreur.message}`);
    logger.warn('   Vérifiez EMAIL_USER et EMAIL_PASS dans votre fichier .env');
  }
};

module.exports = { transporteur, verifierConnexionEmail };
