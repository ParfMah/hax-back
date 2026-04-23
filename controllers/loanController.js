// ════════════════════════════════════════════════════════════════
//  controllers/loanController.js — Logique métier des demandes
//
//  Le "contrôleur" contient la vraie logique de l'application.
//  Il reçoit des données DÉJÀ VALIDÉES par le middleware,
//  effectue les traitements, et retourne une réponse JSON.
//
//  Flux complet d'une demande :
//  Route → rateLimiter → validation → [CE FICHIER] → réponse
// ════════════════════════════════════════════════════════════════

const LoanRequest  = require('../models/LoanRequest');
const { transporteur } = require('../config/email');
const { emailConseiller, emailConfirmationClient } = require('../utils/emailTemplates');
const logger = require('../utils/logger');

// ── Taux annuels par type de prêt (source côté SERVEUR) ──────
// ⚠️  On N'utilise JAMAIS le taux envoyé par le formulaire.
//     Un utilisateur malveillant pourrait envoyer taux=0.
//     Le serveur recalcule TOUJOURS à partir de ces valeurs.
const TAUX_ANNUELS = {
  personnel:  0.030,   // 3.0%
  immobilier: 0.021,   // 2.1%
  automobile: 0.027,   // 2.7%
  rachat:     0.028,   // 2.8%
};

/**
 * Calcule la mensualité d'un prêt amortissable.
 *
 * Formule bancaire standard :
 *   M = C × [t × (1+t)^n] / [(1+t)^n - 1]
 *
 *   M = mensualité
 *   C = capital (montant emprunté)
 *   t = taux mensuel = taux annuel / 12
 *   n = durée en mois
 */
const calculerMensualite = (capital, tauxAnnuel, dureeEnMois) => {
  if (dureeEnMois <= 0 || capital <= 0) return 0;
  const t = tauxAnnuel / 12; // Taux mensuel
  if (t === 0) return capital / dureeEnMois;
  const mensualite = capital * (t * Math.pow(1 + t, dureeEnMois))
                   / (Math.pow(1 + t, dureeEnMois) - 1);
  return Math.round(mensualite * 100) / 100; // Arrondi à 2 décimales
};


// ════════════════════════════════════════════════════════════════
//  1. CRÉER UNE DEMANDE — POST /api/loan-request
// ════════════════════════════════════════════════════════════════
const creerDemande = async (req, res) => {
  try {
    // Les données sont déjà validées et nettoyées par le middleware
    const {
      prenom, nom, email, telephone,
      typePret, montant, duree,
      revenusMensuels, situationPro, message
    } = req.body;

    // Calcul de la mensualité côté serveur (fiable)
    const tauxAnnuel     = TAUX_ANNUELS[typePret];
    const mensualite     = calculerMensualite(montant, tauxAnnuel, duree);

    logger.info(`📝 Nouvelle demande : ${prenom} ${nom} — ${typePret} ${montant}€ / ${duree}mois`);

    // Création et sauvegarde en base de données
    const demande = await LoanRequest.create({
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
        revenusMensuels:   revenusMensuels || 0,
        mensualiteEstimee: mensualite,
        tauxAnnuel:        tauxAnnuel * 100, // Stocké en %
      },
      metadata: {
        // IP réelle (fonctionne aussi derrière nginx)
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
        userAgent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`💾 Demande sauvegardée — Réf: ${demande.reference}`);

    // ── Envoi des emails ──────────────────────────────────
    // On lance les 2 emails EN MÊME TEMPS (parallèle = plus rapide)
    // allSettled = si un email échoue, l'autre continue quand même
    let emailEnvoye = false;
    try {
      const donnees = {
        client:       demande.client,
        pret:         demande.pret,
        reference:    demande.reference,
        dateCreation: demande.createdAt,
      };

      const [resConseiller, resClient] = await Promise.allSettled([
        transporteur.sendMail(emailConseiller(donnees)),
        transporteur.sendMail(emailConfirmationClient(donnees)),
      ]);

      if (resConseiller.status === 'fulfilled') {
        logger.info(`📧 Email conseiller envoyé — Réf: ${demande.reference}`);
        emailEnvoye = true;
      } else {
        logger.error(`❌ Email conseiller échoué : ${resConseiller.reason?.message}`);
      }

      if (resClient.status === 'fulfilled') {
        logger.info(`📧 Email confirmation envoyé à ${email}`);
      } else {
        logger.error(`❌ Email client échoué : ${resClient.reason?.message}`);
      }

      // Mise à jour du flag "email envoyé" en base
      await LoanRequest.updateOne({ _id: demande._id }, { 'metadata.emailEnvoye': emailEnvoye });

    } catch (errEmail) {
      // L'email a planté mais la demande EST bien sauvegardée
      // On ne fait PAS échouer la requête pour autant
      logger.error(`Erreur envoi email : ${errEmail.message}`);
    }

    // ── Réponse de succès au client ───────────────────────
    // 201 = "Created" (une ressource a été créée)
    return res.status(201).json({
      succes:  true,
      message: 'Votre demande a bien été enregistrée ! Un conseiller vous contactera sous 24 heures.',
      data: {
        reference:         demande.reference,
        mensualiteEstimee: mensualite,
        tauxAnnuel:        (tauxAnnuel * 100).toFixed(1) + '%',
        statut:            demande.statut,
        emailEnvoye,
      },
    });

  } catch (erreur) {
    // ── Gestion des erreurs Mongoose ──────────────────────
    if (erreur.name === 'ValidationError') {
      // Les règles du modèle Mongoose ont refusé les données
      const erreursSchema = Object.values(erreur.errors).map(e => ({
        champ:   e.path,
        message: e.message,
      }));
      return res.status(422).json({
        succes: false, message: 'Données invalides', erreurs: erreursSchema,
      });
    }
    // Erreur inattendue
    logger.error(`Erreur création demande : ${erreur.message}`);
    return res.status(500).json({
      succes:  false,
      message: 'Erreur serveur. Veuillez réessayer dans quelques instants.',
    });
  }
};


// ════════════════════════════════════════════════════════════════
//  2. LISTER LES DEMANDES — GET /api/loan-requests
//  (Pour le tableau de bord du conseiller)
// ════════════════════════════════════════════════════════════════
const obtenirToutesDemandes = async (req, res) => {
  try {
    // Pagination : ?page=1&limit=20
    const page   = parseInt(req.query.page)  || 1;
    const limite = parseInt(req.query.limit) || 20;
    // Filtres optionnels : ?statut=en_attente&type=immobilier
    const filtre = {};
    if (req.query.statut) filtre.statut           = req.query.statut;
    if (req.query.type)   filtre['pret.typePret'] = req.query.type;

    const [demandes, total] = await Promise.all([
      LoanRequest
        .find(filtre)
        .sort({ createdAt: -1 })          // Plus récentes d'abord
        .skip((page - 1) * limite)
        .limit(limite)
        .select('-metadata.ipAddress'),   // On n'expose pas les IPs
      LoanRequest.countDocuments(filtre),
    ]);

    return res.status(200).json({
      succes: true,
      data: {
        demandes,
        pagination: { total, page, limite, pages: Math.ceil(total / limite) },
      },
    });
  } catch (erreur) {
    logger.error(`Erreur liste demandes : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  3. UNE SEULE DEMANDE — GET /api/loan-request/:reference
// ════════════════════════════════════════════════════════════════
const obtenirDemandeParReference = async (req, res) => {
  try {
    const { reference } = req.params;

    // Validation simple du format (HAX- + 10 caractères alphanumériques)
    if (!reference || !/^HAX-[A-Z0-9]{10}$/.test(reference.toUpperCase())) {
      return res.status(400).json({ succes: false, message: 'Format de référence invalide (ex: HAX-A1B2C3D4E5)' });
    }

    const demande = await LoanRequest
      .findOne({ reference: reference.toUpperCase() })
      .select('-metadata.ipAddress');

    if (!demande) {
      return res.status(404).json({ succes: false, message: 'Aucune demande trouvée avec cette référence.' });
    }

    return res.status(200).json({ succes: true, data: demande });
  } catch (erreur) {
    logger.error(`Erreur recherche demande : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  4. METTRE À JOUR LE STATUT — PATCH /api/loan-request/:ref/statut
// ════════════════════════════════════════════════════════════════
const mettreAJourStatut = async (req, res) => {
  try {
    const { reference }     = req.params;
    const { statut, notes } = req.body;

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
      { new: true, runValidators: true }
    );

    if (!demande) {
      return res.status(404).json({ succes: false, message: 'Demande introuvable' });
    }

    logger.info(`🔄 Statut mis à jour : ${reference} → ${statut}`);
    return res.status(200).json({ succes: true, message: `Statut mis à jour : ${statut}`, data: demande });
  } catch (erreur) {
    logger.error(`Erreur mise à jour statut : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  5. STATISTIQUES — GET /api/loan-requests/stats
// ════════════════════════════════════════════════════════════════
const obtenirStatistiques = async (req, res) => {
  try {
    const [stats] = await LoanRequest.aggregate([
      {
        $facet: {
          parStatut: [{ $group: { _id: '$statut', count: { $sum: 1 } } }],
          parType:   [{ $group: { _id: '$pret.typePret', count: { $sum: 1 }, montantTotal: { $sum: '$pret.montant' } } }],
          global:    [{ $group: { _id: null, total: { $sum: 1 }, montantMoyen: { $avg: '$pret.montant' }, montantTotal: { $sum: '$pret.montant' } } }],
        },
      },
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
