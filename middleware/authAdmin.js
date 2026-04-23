// ================================================================
//  middleware/authAdmin.js — Protection des routes d'administration
//
//  Ce middleware vérifie que chaque requête vers les routes /admin
//  contient une clé API valide dans le header "x-admin-key".
//
//  C'est une authentification simple par clé API.
//  Pour un système plus robuste en production, envisagez JWT.
// ================================================================

const logger = require('../utils/logger');

/**
 * Vérifie la clé admin dans le header x-admin-key.
 * Si invalide → 401. Si valide → on continue (next()).
 */
const verifierAdmin = (req, res, next) => {
  const cleFournie = req.headers['x-admin-key'];
  const cleAttendue = process.env.ADMIN_KEY;

  // Vérifier que la variable d'environnement est configurée
  if (!cleAttendue) {
    logger.error('⚠️  ADMIN_KEY non définie dans le fichier .env !');
    return res.status(500).json({
      succes:  false,
      message: 'Configuration serveur incorrecte. ADMIN_KEY manquante dans .env',
    });
  }

  // Vérifier la clé fournie
  if (!cleFournie || cleFournie !== cleAttendue) {
    logger.warn(`🚫 Tentative d'accès admin non autorisée — IP: ${req.ip}`);
    return res.status(401).json({
      succes:  false,
      message: 'Accès non autorisé. Clé API invalide ou manquante.',
    });
  }

  // Clé valide — on continue
  next();
};

module.exports = { verifierAdmin };
