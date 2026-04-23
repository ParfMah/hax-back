// ════════════════════════════════════════════════════════════════
//  models/LoanRequest.js — Structure d'une demande de prêt
//
//  Un "modèle Mongoose" = la définition de la structure d'un
//  document MongoDB. C'est comme créer une table SQL avec ses colonnes,
//  mais pour une base de données NoSQL.
//
//  Chaque demande de prêt soumise créera un nouveau "document"
//  dans la collection "loanrequests" de MongoDB.
// ════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── Définition du schéma ────────────────────────────────────
const SchemaDemande = new mongoose.Schema(
  {
    // ── Référence unique ─────────────────────────────────
    // Ex : "HAX-A1B2C3D4E5" — générée automatiquement
    // Elle sert à retrouver une demande facilement
    reference: {
      type:    String,
      unique:  true,
      default: () => `HAX-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
    },

    // ── Informations du client ────────────────────────────
    client: {
      nom: {
        type:      String,
        required:  [true, 'Le nom est obligatoire'],
        trim:      true,
        minlength: [2, 'Minimum 2 caractères'],
        maxlength: [60, 'Maximum 60 caractères'],
      },
      prenom: {
        type:      String,
        required:  [true, 'Le prénom est obligatoire'],
        trim:      true,
        minlength: [2, 'Minimum 2 caractères'],
        maxlength: [60, 'Maximum 60 caractères'],
      },
      email: {
        type:      String,
        required:  [true, 'L\'email est obligatoire'],
        lowercase: true, // Stocké en minuscules
        trim:      true,
        match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Format email invalide'],
      },
      telephone: {
        type:     String,
        required: [true, 'Le téléphone est obligatoire'],
        trim:     true,
      },
      situationPro: {
        type:    String,
        enum:    ['salarie-cdi', 'salarie-cdd', 'independant', 'retraite', 'etudiant', 'autre', ''],
        default: '',
      },
      message: {
        type:      String,
        trim:      true,
        maxlength: [1000, 'Maximum 1000 caractères'],
        default:   '',
      },
    },

    // ── Détails du prêt ───────────────────────────────────
    pret: {
      typePret: {
        type:     String,
        required: [true, 'Le type de prêt est obligatoire'],
        enum:     ['personnel', 'immobilier', 'automobile', 'rachat'],
      },
      montant: {
        type:     Number,
        required: [true, 'Le montant est obligatoire'],
        min:      [1000,    'Minimum 1 000 €'],
        max:      [2000000, 'Maximum 2 000 000 €'],
      },
      duree: {
        type:     Number,
        required: [true, 'La durée est obligatoire'],
        min:      [6,   'Minimum 6 mois'],
        max:      [300, 'Maximum 300 mois'],
      },
      revenusMensuels: {
        type:    Number,
        min:     [0, 'Les revenus ne peuvent pas être négatifs'],
        default: 0,
      },
      // Calculé côté serveur (jamais pris du client)
      mensualiteEstimee: {
        type:    Number,
        default: 0,
      },
      tauxAnnuel: {
        type:    Number,
        default: 0,
      },
    },

    // ── Statut de traitement ──────────────────────────────
    // Permet au conseiller de suivre l'avancement du dossier
    statut: {
      type:    String,
      enum:    ['en_attente', 'en_cours', 'approuve', 'refuse', 'annule'],
      default: 'en_attente',
    },

    // ── Notes internes ────────────────────────────────────
    notesConseiller: {
      type:      String,
      default:   '',
      maxlength: [2000, 'Maximum 2000 caractères'],
    },

    // ── Informations techniques ───────────────────────────
    metadata: {
      ipAddress:    { type: String, default: '' },
      userAgent:    { type: String, default: '' },
      emailEnvoye:  { type: Boolean, default: false },
    },
  },
  {
    // timestamps: true → ajoute automatiquement "createdAt" et "updatedAt"
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;   // Cache le champ de version interne Mongoose
        delete ret._id;   // On garde "id" (version lisible)
        if (ret.metadata) delete ret.metadata.ipAddress; // Pas d'IP dans les réponses API
        return ret;
      },
    },
  }
);

// ── Index pour accélérer les recherches fréquentes ──────────
SchemaDemande.index({ 'client.email': 1 });   // Recherche par email
SchemaDemande.index({ statut: 1 });            // Filtrage par statut
SchemaDemande.index({ createdAt: -1 });        // Tri par date (plus récent d'abord)

// ── Export du modèle ─────────────────────────────────────────
// MongoDB créera la collection "loanrequests" automatiquement
module.exports = mongoose.model('LoanRequest', SchemaDemande);
