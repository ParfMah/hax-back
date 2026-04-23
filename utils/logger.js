// ════════════════════════════════════════════════════════════════
//  utils/logger.js — Système de logs avec Winston
//
//  Pourquoi utiliser un logger plutôt que console.log ?
//  → Niveaux (info, warn, error) → plus facile à filtrer
//  → Sauvegarde dans des fichiers logs/
//  → Format propre avec horodatage
//
//  Utilisation dans les autres fichiers :
//    const logger = require('../utils/logger');
//    logger.info('Message informatif');
//    logger.warn('Avertissement');
//    logger.error('Erreur grave');
// ════════════════════════════════════════════════════════════════

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// Créer le dossier "logs/" s'il n'existe pas encore
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Format pour la console : horodatage coloré, lisible
const formatConsole = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) =>
    `[${timestamp}] ${level}: ${message}`
  )
);

// Format pour les fichiers : JSON structuré
const formatFichier = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  // En développement : affiche tout. En production : seulement les avertissements+
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transports: [
    // Affichage dans le terminal
    new transports.Console({ format: formatConsole }),
    // Sauvegarde des erreurs dans logs/error.log
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level:    'error',
      format:   formatFichier,
      maxsize:  5242880, // 5 Mo max
      maxFiles: 3,
    }),
    // Sauvegarde de tous les logs dans logs/combined.log
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format:   formatFichier,
      maxsize:  5242880,
      maxFiles: 3,
    }),
  ],
});

module.exports = logger;
