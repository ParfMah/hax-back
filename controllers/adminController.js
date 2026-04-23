// ================================================================
//  controllers/adminController.js — Logique du tableau de bord admin
//
//  Ce contrôleur gère les routes réservées aux conseillers :
//  - Connexion (login)
//  - Liste des demandes avec recherche full-text
//  - Statistiques détaillées
// ================================================================

const LoanRequest = require('../models/LoanRequest');
const logger      = require('../utils/logger');

// ════════════════════════════════════════════════════════════════
//  LOGIN ADMIN — POST /api/admin/login
//  Vérifie les identifiants et retourne la clé d'API admin
// ════════════════════════════════════════════════════════════════
const loginAdmin = (req, res) => {
  const { identifiant, mdp } = req.body;

  // Identifiants attendus (depuis le fichier .env)
  const idAttendu  = process.env.ADMIN_LOGIN || 'admin';
  const mdpAttendu = process.env.ADMIN_MDP   || 'haxfinance2025';
  const cleAdmin   = process.env.ADMIN_KEY   || 'admin_haxfinance_2025';

  if (!identifiant || !mdp) {
    return res.status(400).json({ succes: false, message: 'Identifiant et mot de passe requis.' });
  }

  if (identifiant === idAttendu && mdp === mdpAttendu) {
    logger.info(`🔐 Connexion admin réussie depuis IP: ${req.ip}`);
    return res.status(200).json({
      succes:  true,
      message: 'Connexion réussie',
      cle:     cleAdmin,   // Clé retournée au client pour les futures requêtes
    });
  }

  logger.warn(`🚫 Échec connexion admin — IP: ${req.ip} — Identifiant: ${identifiant}`);
  return res.status(401).json({
    succes:  false,
    message: 'Identifiant ou mot de passe incorrect.',
  });
};


// ════════════════════════════════════════════════════════════════
//  LISTE ADMIN DES DEMANDES — GET /api/admin/demandes
//  Version enrichie avec recherche full-text et tri flexible
// ════════════════════════════════════════════════════════════════
const listerDemandesAdmin = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limite   = Math.min(50, parseInt(req.query.limit) || 12);
    const statut   = req.query.statut   || '';
    const type     = req.query.type     || '';
    const recherche = req.query.search  || '';
    const triChamp  = req.query.sort    || 'createdAt';
    const triOrdre  = parseInt(req.query.order) || -1;

    // ── Construction du filtre MongoDB ──────────────────
    const filtre = {};
    if (statut) filtre.statut            = statut;
    if (type)   filtre['pret.typePret']  = type;

    // Recherche dans nom, prénom, email et référence
    if (recherche) {
      const regex = new RegExp(recherche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtre.$or = [
        { 'client.nom':    regex },
        { 'client.prenom': regex },
        { 'client.email':  regex },
        { reference:       regex },
        { 'client.telephone': regex },
      ];
    }

    // ── Champs de tri autorisés (sécurité) ──────────────
    const champsTriAutorises = ['createdAt', 'updatedAt', 'reference', 'pret.montant',
                                 'pret.typePret', 'statut', 'client.nom'];
    const triSanitise = champsTriAutorises.includes(triChamp) ? triChamp : 'createdAt';
    const ordreSanitise = [-1, 1].includes(triOrdre) ? triOrdre : -1;

    const [demandes, total] = await Promise.all([
      LoanRequest
        .find(filtre)
        .sort({ [triSanitise]: ordreSanitise })
        .skip((page - 1) * limite)
        .limit(limite)
        .select('-metadata.ipAddress -metadata.userAgent'),
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
          pages: Math.ceil(total / limite) || 1,
        },
      },
    });

  } catch (erreur) {
    logger.error(`Erreur liste admin : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  DEMANDE UNIQUE (ADMIN) — GET /api/admin/demande/:reference
//  Version admin : expose plus de détails
// ════════════════════════════════════════════════════════════════
const voirDemandeAdmin = async (req, res) => {
  try {
    const { reference } = req.params;
    const demande = await LoanRequest.findOne({
      reference: reference.toUpperCase()
    }).select('-metadata.ipAddress');

    if (!demande) {
      return res.status(404).json({ succes: false, message: 'Demande introuvable.' });
    }

    return res.status(200).json({ succes: true, data: demande });
  } catch (erreur) {
    logger.error(`Erreur voir demande admin : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


// ════════════════════════════════════════════════════════════════
//  STATISTIQUES ADMIN — GET /api/admin/stats
//  Agrégations MongoDB pour le dashboard
// ════════════════════════════════════════════════════════════════
const statsAdmin = async (req, res) => {
  try {
    // Plage de dates (optionnel)
    const filtre = {};
    if (req.query.depuis) filtre.createdAt = { $gte: new Date(req.query.depuis) };
    if (req.query.jusqu)  filtre.createdAt = { ...filtre.createdAt, $lte: new Date(req.query.jusqu) };

    const [stats] = await LoanRequest.aggregate([
      { $match: filtre },
      {
        $facet: {
          // Stats globales
          global: [{
            $group: {
              _id:           null,
              total:         { $sum: 1 },
              montantTotal:  { $sum: '$pret.montant' },
              montantMoyen:  { $avg: '$pret.montant' },
              mensualiteMoy: { $avg: '$pret.mensualiteEstimee' },
            }
          }],

          // Par statut
          parStatut: [{
            $group: {
              _id:   '$statut',
              count: { $sum: 1 },
            }
          }],

          // Par type de prêt
          parType: [{
            $group: {
              _id:          '$pret.typePret',
              count:        { $sum: 1 },
              montantTotal: { $sum: '$pret.montant' },
              montantMoyen: { $avg: '$pret.montant' },
            }
          }],

          // Par mois (12 derniers mois)
          parMois: [{
            $match: {
              createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
            }
          }, {
            $group: {
              _id: {
                annee: { $year: '$createdAt' },
                mois:  { $month: '$createdAt' },
              },
              count:        { $sum: 1 },
              montantTotal: { $sum: '$pret.montant' },
            }
          }, {
            $sort: { '_id.annee': 1, '_id.mois': 1 }
          }],

          // Dernières 24h
          recentes24h: [{
            $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          }, {
            $group: { _id: null, count: { $sum: 1 } }
          }],
        }
      }
    ]);

    return res.status(200).json({ succes: true, data: stats });

  } catch (erreur) {
    logger.error(`Erreur stats admin : ${erreur.message}`);
    return res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
};


module.exports = { loginAdmin, listerDemandesAdmin, voirDemandeAdmin, statsAdmin };
