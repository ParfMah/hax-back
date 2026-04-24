// ================================================================
//  controllers/loanController.js
//  Logique métier pour les demandes de prêt
//
//  Le contrôleur est le "cerveau" de chaque route.
//  Il reçoit la requête validée, exécute la logique métier,
//  interagit avec la base de données et les services (email),
//  puis retourne une réponse.
//
//  Structure MVC :
//    Route → Middleware → Controller → Model + Services → Réponse
// ================================================================

const LoanRequest = require('../models/LoanRequest');
const { transporteur } = require('../config/email');
const { emailConseiller, emailConfirmationClient } = require('../utils/emailTemplates');
const logger = require('../utils/logger');

// ── Taux annuels par type de prêt ───────────────────────────
// Source unique de vérité côté serveur.
// On NE fait JAMAIS confiance au taux envoyé par le client.
const TAUX_ANNUELS = {
  'personnel':  0.030,   // 3.0%
  'immobilier': 0.021,   // 2.1%
  'automobile': 0.027,   // 2.7%
  'rachat':     0.028,   // 2.8%
};

/**
 * Calcule la mensualité d'un prêt amortissable.
 * Formule : M = C × [t(1+t)^n] / [(1+t)^n - 1]
 *
 * @param {number} capital  - Montant emprunté en €
 * @param {number} tauxAnn  - Taux annuel (ex: 0.03 pour 3%)
 * @param {number} n        - Durée en mois
 * @returns {number}        - Mensualité arrondie à 2 décimales
 */
const calculerMensualite = (capital, tauxAnn, n) => {
  if (n <= 0 || capital <= 0) return 0;
  const tauxMens = tauxAnn / 12;
  if (tauxMens === 0) return capital / n;
  const mensualite = capital * (tauxMens * Math.pow(1 + tauxMens, n))
                   / (Math.pow(1 + tauxMens, n) - 1);
  return Math.round(mensualite * 100) / 100;
};


// ════════════════════════════════════════════════════════════════
//  CONTRÔLEUR 1 : Créer une demande de prêt
//  POST /api/loan-request
// ════════════════════════════════════════════════════════════════
const creerDemande = async (req, res) => {
  try {
    // ── 1. Extraction des données validées ──────────────────
    // À ce stade, les données sont déjà validées et nettoyées
    // par le middleware express-validator
    const {
      prenom, nom, email, telephone,
      typePret, montant, duree,
      revenusMensuels, situationPro, message
    } = req.body;

    // ── 2. Calcul serveur de la mensualité ──────────────────
    // IMPORTANT : On recalcule toujours côté serveur !
    // Ne jamais faire confiance aux données calculées côté client.
    const tauxAnnuel      = TAUX_ANNUELS[typePret];
    const mensualiteCalc  = calculerMensualite(montant, tauxAnnuel, duree);

    // ── 3. Création de l'objet demande ──────────────────────
    const nouvelleDemande = new LoanRequest({
      client: {
        nom,
        prenom,
        email,
        telephone,
        situationPro: situationPro || '',
        message:      message      || '',
      },
      pret: {
        typePret,
        montant,
        duree,
        revenusMensuels: revenusMensuels || 0,
        mensualiteEstimee: mensualiteCalc,
        tauxAnnuel:        tauxAnnuel * 100, // Stocké en pourcentage
      },
      metadata: {
        // Récupération de la vraie IP (même derrière un proxy nginx)
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
        userAgent: req.headers['user-agent'] || '',
      }
    });

    // ── 4. Sauvegarde en base de données ────────────────────
    await nouvelleDemande.save();
    logger.info(`💾 Demande sauvegardée avec la référence : ${nouvelleDemande.reference}`);

    // ── 5. Envoi des emails (en parallèle pour la performance) ─
    let emailEnvoye = false;
    try {
      // Données formatées pour les templates
      const donneesEmail = {
        client:      nouvelleDemande.client,
        pret:        nouvelleDemande.pret,
        reference:   nouvelleDemande.reference,
        dateCreation: nouvelleDemande.createdAt,
      };

      // Promise.allSettled : lance les 2 emails en parallèle
      // et n'échoue pas si l'un des deux plante
      const [resultConseiller, resultClient] = await Promise.allSettled([
        transporteur.sendMail(emailConseiller(donneesEmail)),
        transporteur.sendMail(emailConfirmationClient(donneesEmail)),
      ]);

      // Log du résultat de chaque email
      if (resultConseiller.status === 'fulfilled') {
        logger.info(`📧 Email conseiller envoyé — Ref: ${nouvelleDemande.reference}`);
        emailEnvoye = true;
      } else {
        logger.error(`❌ Email conseiller échoué : ${resultConseiller.reason?.message}`);
      }

      if (resultClient.status === 'fulfilled') {
        logger.info(`📧 Email confirmation client envoyé — ${email}`);
      } else {
        logger.error(`❌ Email client échoué : ${resultClient.reason?.message}`);
      }

      // Mettre à jour le flag email en base
      await LoanRequest.updateOne(
        { _id: nouvelleDemande._id },
        { 'metadata.emailEnvoye': emailEnvoye }
      );

    } catch (erreurEmail) {
      // L'email a planté mais on ne fait PAS échouer la requête :
      // la demande est bien en base, les emails peuvent être renvoyés manuellement
      logger.error(`Erreur envoi email : ${erreurEmail.message}`);
    }

    // ── 6. Réponse de succès ────────────────────────────────
    // Status 201 = "Created" (ressource créée avec succès)
    return res.status(201).json({
      succes: true,
      message: 'Votre demande a bien été enregistrée. Un conseiller vous contactera sous 24h.',
      data: {
        reference:         nouvelleDemande.reference,
        mensualiteEstimee: mensualiteCalc,
        tauxAnnuel:        (tauxAnnuel * 100).toFixed(1) + '%',
        statut:            nouvelleDemande.statut,
        emailEnvoye,
      },
    });

  } catch (erreur) {
    // ── Gestion des erreurs Mongoose ────────────────────────
    if (erreur.name === 'ValidationError') {
      // Erreur de validation Mongoose (double sécurité)
      const erreursSchema = Object.values(erreur.errors).map(e => ({
        champ:   e.path,
        message: e.message,
      }));
      return res.status(422).json({
        succes: false,
        message: 'Données invalides',
        erreurs: erreursSchema,
      });
    }

    if (erreur.code === 11000) {
      // Violation de contrainte d'unicité (ex: référence dupliquée — très rare)
      return res.status(409).json({
        succes: false,
        message: 'Une erreur de duplication s\'est produite. Veuillez réessayer.',
      });
    }

    // Erreur inattendue → 500
    logger.error(`Erreur création demande : ${erreur.message}`, { stack: erreur.stack });
    return res.status(500).json({
      succes: false,
      message: 'Une erreur serveur s\'est produite. Veuillez réessayer dans quelques instants.',
    });
  }
};


// ════════════════════════════════════════════════════════════════
//  CONTRÔLEUR 2 : Récupérer toutes les demandes
//  GET /api/loan-requests
//  (Route d'administration — à protéger en production)
// ════════════════════════════════════════════════════════════════
const obtenirToutesDemandes = async (req, res) => {
  try {
    // Paramètres de pagination et filtres depuis la query string
    // Ex: /api/loan-requests?page=1&limit=10&statut=en_attente
    const page    = parseInt(req.query.page)  || 1;
    const limite  = parseInt(req.query.limit) || 20;
    const statut  = req.query.statut;
    const type    = req.query.type;

    // Construction du filtre MongoDB
    const filtre = {};
    if (statut) filtre.statut            = statut;
    if (type)   filtre['pret.typePret']  = type;

    // Requête avec pagination
    const [demandes, total] = await Promise.all([
      LoanRequest
        .find(filtre)
        .sort({ createdAt: -1 })   // Plus récentes en premier
        .skip((page - 1) * limite)
        .limit(limite)
        .select('-metadata.ipAddress'), // Exclure les IPs de la réponse
      LoanRequest.countDocuments(filtre),
    ]);

    return res.status(200).json({
      succes: true,
      data: {
        demandes,
        pagination: {
          total,
          page,
          limite,
          pages: Math.ceil(total / limite),
        },
      },
    });

  } catch (erreur) {
    logger.error(`Erreur récupération demandes : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  CONTRÔLEUR 3 : Récupérer une demande par référence
//  GET /api/loan-request/:reference
// ════════════════════════════════════════════════════════════════
const obtenirDemandeParReference = async (req, res) => {
  try {
    const { reference } = req.params;

    // Validation basique du format de la référence
    if (!reference || !/^HAX-[A-Z0-9]{10}$/.test(reference)) {
      return res.status(400).json({
        succes: false,
        message: 'Format de référence invalide',
      });
    }

    const demande = await LoanRequest
      .findOne({ reference: reference.toUpperCase() })
      .select('-metadata.ipAddress');

    if (!demande) {
      return res.status(404).json({
        succes: false,
        message: 'Aucune demande trouvée avec cette référence',
      });
    }

    return res.status(200).json({ succes: true, data: demande });

  } catch (erreur) {
    logger.error(`Erreur recherche demande : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  CONTRÔLEUR 4 : Mettre à jour le statut d'une demande
//  PATCH /api/loan-request/:reference/statut
//  (Pour le tableau de bord conseiller)
// ════════════════════════════════════════════════════════════════
const mettreAJourStatut = async (req, res) => {
  try {
    const { reference }      = req.params;
    const { statut, notes }  = req.body;

    const statutsValides = ['en_attente', 'en_cours', 'approuve', 'refuse', 'annule'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        succes: false,
        message: `Statut invalide. Valeurs acceptées : ${statutsValides.join(', ')}`,
      });
    }

    const miseAJour = { statut };
    if (notes !== undefined) miseAJour.notesConseiller = notes;

    const demande = await LoanRequest.findOneAndUpdate(
      { reference },
      miseAJour,
      { new: true, runValidators: true }  // new: true = retourne le doc mis à jour
    );

    if (!demande) {
      return res.status(404).json({ succes: false, message: 'Demande introuvable' });
    }

    logger.info(`🔄 Statut mis à jour : ${demande.reference} → ${statut}`);
    return res.status(200).json({
      succes: true,
      message: `Statut mis à jour : ${statut}`,
      data: demande,
    });

  } catch (erreur) {
    logger.error(`Erreur mise à jour statut : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  CONTRÔLEUR 5 : Statistiques rapides
//  GET /api/loan-requests/stats
// ════════════════════════════════════════════════════════════════
const obtenirStatistiques = async (req, res) => {
  try {
    // Aggregation MongoDB : plusieurs calculs en une seule requête
    const [stats] = await LoanRequest.aggregate([
      {
        $facet: {
          // Total par statut
          parStatut: [
            { $group: { _id: '$statut', count: { $sum: 1 } } }
          ],
          // Total par type de prêt
          parType: [
            { $group: { _id: '$pret.typePret', count: { $sum: 1 }, montantTotal: { $sum: '$pret.montant' } } }
          ],
          // Montant moyen
          global: [
            {
              $group: {
                _id: null,
                totalDemandes:  { $sum: 1 },
                montantMoyen:   { $avg: '$pret.montant' },
                montantTotal:   { $sum: '$pret.montant' },
              }
            }
          ]
        }
      }
    ]);

    return res.status(200).json({ succes: true, data: stats });

  } catch (erreur) {
    logger.error(`Erreur statistiques : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


module.exports = {
  creerDemande,
  obtenirToutesDemandes,
  obtenirDemandeParReference,
  mettreAJourStatut,
  obtenirStatistiques,
};
