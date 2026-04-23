// ════════════════════════════════════════════════════════════════
//  middleware/validation.js — Validation des données reçues
//
//  Un "middleware" = une fonction intermédiaire qui s'exécute
//  AVANT le contrôleur. Elle vérifie que les données sont correctes.
//
//  Même si votre formulaire HTML valide déjà côté client,
//  la validation serveur est INDISPENSABLE : quelqu'un peut appeler
//  votre API directement (via Postman, script, etc.).
//
//  On utilise express-validator (très populaire, bien documenté).
// ════════════════════════════════════════════════════════════════

const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// ── Règles de validation pour POST /api/loan-request ────────
// Chaque "body('champ')" définit les règles pour un champ
const reglesValidationDemande = [

  // Prénom : obligatoire, 2 à 60 caractères, caractères HTML échappés
  body('prenom')
    .trim()
    .notEmpty().withMessage('Le prénom est obligatoire')
    .isLength({ min: 2, max: 60 }).withMessage('Le prénom doit faire entre 2 et 60 caractères')
    .escape(), // Protège contre les injections XSS (ex: <script>)

  // Nom : mêmes règles
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ min: 2, max: 60 }).withMessage('Le nom doit faire entre 2 et 60 caractères')
    .escape(),

  // Email : format valide obligatoire
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire')
    .isEmail().withMessage('Format d\'email invalide (ex: marie@gmail.com)')
    .normalizeEmail() // Met en minuscules, normalise les adresses Gmail
    .isLength({ max: 254 }).withMessage('Email trop long'),

  // Téléphone : format flexible (9 à 15 chiffres, espaces et + acceptés)
  body('telephone')
    .trim()
    .notEmpty().withMessage('Le numéro de téléphone est obligatoire')
    .matches(/^[\d\s\+\-\.]{9,15}$/).withMessage('Téléphone invalide (9 à 15 chiffres)'),

  // Type de prêt : doit être l'une des 4 valeurs autorisées
  body('typePret')
    .notEmpty().withMessage('Le type de prêt est obligatoire')
    .isIn(['personnel', 'immobilier', 'automobile', 'rachat'])
    .withMessage('Type de prêt invalide. Valeurs acceptées : personnel, immobilier, automobile, rachat'),

  // Montant : nombre entre 1 000 et 2 000 000
  body('montant')
    .notEmpty().withMessage('Le montant est obligatoire')
    .isFloat({ min: 1000, max: 2000000 }).withMessage('Le montant doit être entre 1 000 € et 2 000 000 €')
    .toFloat(), // Convertit automatiquement la string en nombre

  // Durée : entier entre 6 et 300 mois
  body('duree')
    .notEmpty().withMessage('La durée est obligatoire')
    .isInt({ min: 6, max: 300 }).withMessage('La durée doit être entre 6 et 300 mois')
    .toInt(),

  // Revenus : optionnel, mais si présent doit être un nombre positif
  body('revenusMensuels')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Les revenus doivent être un nombre positif')
    .toFloat(),

  // Situation professionnelle : optionnelle, valeurs limitées
  body('situationPro')
    .optional()
    .isIn(['salarie-cdi', 'salarie-cdd', 'independant', 'retraite', 'etudiant', 'autre', ''])
    .withMessage('Situation professionnelle invalide'),

  // Message : optionnel, max 1000 caractères
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Le message ne peut pas dépasser 1000 caractères')
    .escape(),
];


// ── Middleware de vérification ───────────────────────────────
// Ce middleware s'exécute APRÈS les règles ci-dessus.
// Si une règle a échoué, il retourne les erreurs au client.
// Sinon, il passe au contrôleur (next()).
const gererErreursValidation = (req, res, next) => {
  const erreurs = validationResult(req);

  if (!erreurs.isEmpty()) {
    // Formater proprement la liste d'erreurs
    const erreursFormattees = erreurs.array().map(err => ({
      champ:   err.path,    // Nom du champ problématique
      message: err.msg,     // Message d'erreur lisible
    }));

    logger.warn(`Validation échouée [IP:${req.ip}] — ${erreursFormattees.length} erreur(s)`);

    // 422 = "Unprocessable Entity" (données reçues mais invalides)
    return res.status(422).json({
      succes:  false,
      message: `Formulaire invalide — ${erreursFormattees.length} erreur(s) détectée(s)`,
      erreurs: erreursFormattees,
    });
  }

  // Tout est bon, on continue vers le contrôleur
  next();
};

module.exports = { reglesValidationDemande, gererErreursValidation };
