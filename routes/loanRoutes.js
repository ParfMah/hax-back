// ════════════════════════════════════════════════════════════════
//  routes/loanRoutes.js — Définition des routes de l'API
//
//  Ce fichier connecte chaque URL à son contrôleur.
//  C'est l'annuaire de votre API : "quand quelqu'un appelle
//  cette URL avec cette méthode, exécute cette fonction".
//
//  Format : router.METHODE('/chemin', middleware1, middleware2, ..., controleur)
//  Les middlewares s'exécutent dans l'ordre, de gauche à droite.
// ════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

// Contrôleurs
const {
  creerDemande,
  obtenirToutesDemandes,
  obtenirDemandeParReference,
  mettreAJourStatut,
  obtenirStatistiques,
} = require('../controllers/loanController');

// Middlewares
const { reglesValidationDemande, gererErreursValidation } = require('../middleware/validation');
const { limiteFormulairePret } = require('../middleware/rateLimiter');


// ════════════════════════════════════════════════════════════════
//  ROUTES PUBLIQUES (accessibles depuis le formulaire HTML)
// ════════════════════════════════════════════════════════════════

/**
 * POST /api/loan-request
 * ─────────────────────
 * Soumettre une nouvelle demande de prêt depuis le formulaire HTML.
 *
 * Étapes dans l'ordre :
 * 1. limiteFormulairePret    → Max 10 tentatives / 15 min
 * 2. reglesValidationDemande → Valider chaque champ
 * 3. gererErreursValidation  → Bloquer si erreurs, continuer sinon
 * 4. creerDemande            → Sauvegarder + envoyer emails
 */
router.post(
  '/loan-request',
  limiteFormulairePret,
  reglesValidationDemande,
  gererErreursValidation,
  creerDemande
);

/**
 * GET /api/loan-request/:reference
 * ──────────────────────────────────
 * Récupérer une demande par sa référence (ex: HAX-A1B2C3D4E5).
 * Permet au client de suivre le statut de sa demande.
 */
router.get('/loan-request/:reference', obtenirDemandeParReference);


// ════════════════════════════════════════════════════════════════
//  ROUTES ADMINISTRATION
//  ⚠️  Protéger ces routes en production avec une authentification !
//  Pour l'instant elles sont ouvertes (pour faciliter les tests).
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/loan-requests/stats
 * ─────────────────────────────
 * Statistiques globales pour le tableau de bord.
 * IMPORTANT : doit être défini AVANT /loan-requests (pas /:reference)
 */
router.get('/loan-requests/stats', obtenirStatistiques);

/**
 * GET /api/loan-requests
 * ──────────────────────
 * Lister toutes les demandes avec pagination et filtres.
 * ?page=1&limit=10&statut=en_attente&type=immobilier
 */
router.get('/loan-requests', obtenirToutesDemandes);

/**
 * PATCH /api/loan-request/:reference/statut
 * ──────────────────────────────────────────
 * Mettre à jour le statut d'une demande (pour le conseiller).
 * Body attendu : { "statut": "en_cours", "notes": "..." }
 */
router.patch('/loan-request/:reference/statut', mettreAJourStatut);


module.exports = router;
