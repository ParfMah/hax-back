// ================================================================
//  routes/adminRoutes.js — Routes du tableau de bord administrateur
//
//  Toutes ces routes sont protégées par le middleware verifierAdmin
//  (sauf /login qui est publique mais vérifie les identifiants).
// ================================================================

const express = require('express');
const router  = express.Router();

const { loginAdmin, listerDemandesAdmin, voirDemandeAdmin, statsAdmin } = require('../controllers/adminController');
const { verifierAdmin } = require('../middleware/authAdmin');
const rateLimit = require('express-rate-limit');

// ── Rate limit strict pour le login (anti-brute force) ──────
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      5,                 // 5 tentatives max
  message: { succes: false, message: 'Trop de tentatives de connexion. Attendez 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Routes publiques ─────────────────────────────────────────

/**
 * POST /api/admin/login
 * Authentification du conseiller.
 * Body: { identifiant: "admin", mdp: "monmotdepasse" }
 */
router.post('/admin/login', limiteLogin, loginAdmin);


// ── Routes protégées (nécessitent x-admin-key valide) ────────
// Le middleware verifierAdmin est appliqué à toutes les routes suivantes

/**
 * GET /api/admin/stats
 * Statistiques globales pour le dashboard.
 * ?depuis=2025-01-01&jusqu=2025-12-31 (optionnel)
 */
router.get('/admin/stats', verifierAdmin, statsAdmin);

/**
 * GET /api/admin/demandes
 * Liste paginée et filtrée des demandes.
 * ?page=1&limit=12&statut=en_attente&type=immobilier&search=dupont&sort=createdAt&order=-1
 */
router.get('/admin/demandes', verifierAdmin, listerDemandesAdmin);

/**
 * GET /api/admin/demande/:reference
 * Détail complet d'une demande (version admin).
 */
router.get('/admin/demande/:reference', verifierAdmin, voirDemandeAdmin);


module.exports = router;
