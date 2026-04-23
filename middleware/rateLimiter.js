// ════════════════════════════════════════════════════════════════
//  middleware/rateLimiter.js — Limitation du nombre de requêtes
//
//  Le "rate limiting" empêche les abus :
//  → Bots qui soumettent des milliers de fausses demandes
//  → Attaques par force brute
//  → Surcharge du serveur
//
//  On a deux niveaux :
//  - limiteGenerale     : s'applique à toute l'API (souple)
//  - limiteFormulaire   : s'applique uniquement au formulaire (strict)
// ════════════════════════════════════════════════════════════════

const rateLimit = require('express-rate-limit');
const logger    = require('../utils/logger');

// Réponse commune quand la limite est atteinte
const handlerLimite = (req, res) => {
  logger.warn(`⚠️  Rate limit atteint — IP: ${req.ip} — Route: ${req.path}`);
  res.status(429).json({
    succes:  false,
    // 429 = "Too Many Requests"
    message: 'Trop de tentatives depuis votre adresse IP. Veuillez patienter quelques minutes.',
  });
};

// ── Limiteur strict pour le formulaire de prêt ──────────────
// 10 soumissions maximum par IP toutes les 15 minutes
// Assez généreux pour un vrai utilisateur, bloquant pour un bot
const limiteFormulairePret = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)       || 10,
  standardHeaders: true,   // Envoie les headers "RateLimit-*" au client
  legacyHeaders:   false,
  handler:         handlerLimite,
});

// ── Limiteur général pour toute l'API ───────────────────────
// 100 requêtes par minute — bloque seulement les bots agressifs
const limiteGenerale = rateLimit({
  windowMs:        60 * 1000,  // 1 minute
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         handlerLimite,
});

module.exports = { limiteFormulairePret, limiteGenerale };
