// ════════════════════════════════════════════════════════════════
//  utils/emailTemplates.js — Templates HTML des emails
//
//  Ce fichier contient le contenu visuel des deux emails envoyés :
//  1. emailConseiller()       → Email au conseiller HaxFinance
//  2. emailConfirmationClient() → Email de confirmation au client
//
//  Le HTML est inline (styles dans les balises) car les clients
//  email (Gmail, Outlook) n'acceptent pas les CSS externes.
// ════════════════════════════════════════════════════════════════

// ── Fonctions utilitaires ────────────────────────────────────

/** Formate un nombre en euros : 15000 → "15 000,00 €" */
const fmt = (montant) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);

/** Formate une date : 2025-01-15T10:30 → "15 janvier 2025 à 10h30" */
const fmtDate = (date) =>
  new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/** Labels affichables par type de prêt */
const LABELS_PRET = {
  personnel:  '💳 Prêt Personnel',
  immobilier: '🏠 Prêt Immobilier',
  automobile: '🚗 Prêt Automobile',
  rachat:     '🔄 Rachat de Crédit',
};

/** Labels affichables par situation professionnelle */
const LABELS_SITUATION = {
  'salarie-cdi': 'Salarié CDI',
  'salarie-cdd': 'Salarié CDD',
  'independant': 'Travailleur indépendant',
  'retraite':    'Retraité',
  'etudiant':    'Étudiant',
  'autre':       'Autre',
};

// ── Styles communs (CSS inline pour compatibilité email) ─────
const S = {
  body:      'font-family:Arial,sans-serif;background:#F4F7FC;margin:0;padding:20px;',
  wrap:      'max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1);',
  header:    'background:#07112B;padding:28px 32px;text-align:center;',
  logoTxt:   'font-size:22px;font-weight:700;color:#fff;',
  logoSpan:  'color:#00C896;',
  body2:     'padding:28px 32px;',
  h1:        'font-size:18px;font-weight:700;color:#07112B;margin:0 0 6px;',
  sub:       'font-size:13px;color:#8A9BC0;margin:0 0 24px;',
  secTitle:  'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8A9BC0;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #EDF0F7;',
  table:     'width:100%;border-collapse:collapse;margin-bottom:20px;',
  tdL:       'padding:8px 0;font-size:13px;color:#8A9BC0;width:45%;',
  tdR:       'padding:8px 0;font-size:13px;color:#07112B;font-weight:600;',
  badge:     'display:inline-block;background:rgba(0,200,150,.12);color:#00A07A;font-size:12px;font-weight:700;padding:3px 10px;border-radius:50px;',
  btn:       'display:inline-block;background:#00C896;color:#07112B;font-size:14px;font-weight:700;padding:12px 28px;border-radius:50px;text-decoration:none;',
  footer:    'background:#F4F7FC;padding:16px 32px;text-align:center;',
  footerTxt: 'font-size:11px;color:#8A9BC0;margin:0;',
};


// ════════════════════════════════════════════════════════════════
//  EMAIL 1 : Notification au conseiller
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  EMAIL 1 : Notification au conseiller (POUR TOI)
// ════════════════════════════════════════════════════════════════
const emailConseiller = ({ client, pret, reference, dateCreation }) => {
  const typeLabel     = LABELS_PRET[pret.typePret]        || pret.typePret;
  const situationLbl  = LABELS_SITUATION[client.situationPro] || client.situationPro || '—';
  const tauxEndt      = pret.revenusMensuels > 0
    ? ((pret.mensualiteEstimee / pret.revenusMensuels) * 100).toFixed(1) + '%'
    : 'Non renseigné';

  return {
    to:      process.env.EMAIL_CONSEILLER,
    from:    `"Système HaxFinance" <${process.env.EMAIL_FROM}>`,
    replyTo: client.email,
    subject: `🔔 NOUVELLE DEMANDE [${reference}] — ${client.prenom} ${client.nom}`,

    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="${S.body}">
<div style="${S.wrap}">
  <div style="${S.header}">
    <div style="${S.logoTxt}">Hax<span style="${S.logoSpan}">Finance</span></div>
    <div style="color:#8A9BC0;font-size:12px;margin-top:4px;">Espace Administration</div>
  </div>
  <div style="${S.body2}">
    <div style="background:#FFF8E7;border-left:4px solid #F0B429;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
      <strong style="color:#07112B;">🔔 Nouvelle demande reçue</strong><br>
      <span style="font-size:12px;color:#8A9BC0;">Réf : <b style="color:#07112B;background:#EDF0F7;padding:2px 8px;border-radius:4px;">${reference}</b> · Le ${fmtDate(dateCreation)}</span>
    </div>

    <div style="${S.secTitle}">👤 Client</div>
    <table style="${S.table}">
      <tr><td style="${S.tdL}">Nom complet</td><td style="${S.tdR}">${client.prenom} ${client.nom}</td></tr>
      <tr><td style="${S.tdL}">Email</td><td style="${S.tdR}"><a href="mailto:${client.email}" style="color:#00C896;">${client.email}</a></td></tr>
      <tr><td style="${S.tdL}">Téléphone</td><td style="${S.tdR}"><a href="tel:${client.telephone}" style="color:#00C896;">${client.telephone}</a></td></tr>
      <tr><td style="${S.tdL}">Situation pro.</td><td style="${S.tdR}">${situationLbl}</td></tr>
    </table>

    <div style="${S.secTitle}">💰 Prêt demandé</div>
    <table style="${S.table}">
      <tr><td style="${S.tdL}">Type</td><td style="${S.tdR}"><span style="${S.badge}">${typeLabel}</span></td></tr>
      <tr><td style="${S.tdL}">Montant</td><td style="${S.tdR};font-size:18px;color:#00C896;">${fmt(pret.montant)}</td></tr>
      <tr><td style="${S.tdL}">Durée</td><td style="${S.tdR}">${pret.duree} mois (${(pret.duree/12).toFixed(1)} ans)</td></tr>
      <tr><td style="${S.tdL}">Mensualité estimée</td><td style="${S.tdR}">${fmt(pret.mensualiteEstimee)} / mois</td></tr>
      <tr><td style="${S.tdL}">Revenus nets</td><td style="${S.tdR}">${pret.revenusMensuels ? fmt(pret.revenusMensuels) : '—'}</td></tr>
      <tr><td style="${S.tdL}">Taux d'endettement</td><td style="${S.tdR};color:${parseFloat(tauxEndt)>33?'#ef4444':'#22c55e'};">${tauxEndt}</td></tr>
    </table>

    ${client.message ? `
    <div style="${S.secTitle}">💬 Message du client</div>
    <div style="background:#F4F7FC;border-radius:8px;padding:14px;font-size:13px;color:#07112B;font-style:italic;margin-bottom:20px;line-height:1.6;">"${client.message}"</div>
    ` : ''}

    <div style="text-align:center;margin-top:24px;">
      <a href="mailto:${client.email}?subject=Re: Votre demande [${reference}]" style="${S.btn}">Contacter le client</a>
    </div>
  </div>
  <div style="${S.footer}"><p style="${S.footerTxt}">HaxFinance Administration · Réf. ${reference}</p></div>
</div>
</body></html>`,
  };
};

// ════════════════════════════════════════════════════════════════
//  EMAIL 2 : Confirmation au client
// ════════════════════════════════════════════════════════════════
const emailConfirmationClient = ({ client, pret, reference, dateCreation }) => {
  const typeLabel = LABELS_PRET[pret.typePret] || pret.typePret;

  return {
    to:      client.email,
    from:    process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: `✅ Demande bien reçue [${reference}] — HaxFinance`,

    text: [
      `Bonjour ${client.prenom},`,
      ``,
      `Nous avons bien reçu votre demande de ${typeLabel} d'un montant de ${fmt(pret.montant)}.`,
      ``,
      `Votre référence : ${reference}`,
      `Un conseiller vous contactera sous 24 heures ouvrées.`,
      ``,
      `Cordialement,`,
      `L'équipe HaxFinance`,
    ].join('\n'),

    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="${S.body}">
<div style="${S.wrap}">
  <div style="${S.header}">
    <div style="font-size:40px;margin-bottom:10px;">✅</div>
    <div style="${S.logoTxt}">Hax<span style="${S.logoSpan}">Finance</span></div>
    <div style="color:#8A9BC0;font-size:12px;margin-top:4px;">Confirmation de votre demande</div>
  </div>
  <div style="${S.body2}">
    <h1 style="${S.h1}">Bonjour ${client.prenom}, votre demande est enregistrée !</h1>
    <p style="${S.sub}">Merci de votre confiance. Voici le récapitulatif de votre demande.</p>

    <div style="background:#07112B;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
      <div style="font-size:11px;color:#8A9BC0;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Votre référence de dossier</div>
      <div style="font-size:22px;font-weight:700;color:#00C896;letter-spacing:.05em;">${reference}</div>
      <div style="font-size:11px;color:#8A9BC0;margin-top:4px;">Conservez ce numéro pour vos échanges avec votre conseiller</div>
    </div>

    <div style="${S.secTitle}">📋 Récapitulatif</div>
    <table style="${S.table}">
      <tr><td style="${S.tdL}">Type de prêt</td><td style="${S.tdR}">${typeLabel}</td></tr>
      <tr><td style="${S.tdL}">Montant demandé</td><td style="${S.tdR};font-size:16px;color:#00C896;">${fmt(pret.montant)}</td></tr>
      <tr><td style="${S.tdL}">Durée </td><td style="${S.tdR}">${pret.duree} mois</td></tr>
      <tr><td style="${S.tdL}">Mensualité estimée</td><td style="${S.tdR}">${fmt(pret.mensualiteEstimee)} / mois</td></tr>
      <tr><td style="${S.tdL}">Date de soumission</td><td style="${S.tdR}">${fmtDate(dateCreation)}</td></tr>
    </table>

    <div style="${S.secTitle}">📅 Prochaines étapes</div>
    ${[
      'Un conseiller analysera votre dossier sous <b>24h ouvrées</b>.',
      'Vous serez contacté par email, par whatsApp ou par téléphone.',
      'Préparez vos <b>3 derniers bulletins de salaire</b> (ou <b>2 derniers bilans</b>)</b> et votre <b>avis d\'imposition</b>.',
      'Aucune décision définitive n\'est prise sans votre accord.',
    ].map((e, i) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:#F4F7FC;border-radius:8px;margin-bottom:8px;">
      <div style="background:#00C896;color:#07112B;border-radius:50%;min-width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:700;">${i+1}</div>
      <div style="font-size:13px;color:#07112B;line-height:1.5;">${e}</div>
    </div>`).join('')}

    <div style="text-align:center;margin-top:24px;padding:16px;background:#F4F7FC;border-radius:8px;">
      <div style="font-size:12px;color:#8A9BC0;margin-bottom:4px;">Une question ? Écrivez-nous</div>
      <a href="mailto:${process.env.EMAIL_REPLY_TO||'contact@haxfinance.fr'}" style="color:#00C896;font-weight:700;font-size:13px;">${process.env.EMAIL_REPLY_TO||'contact@haxfinance.fr'}</a>
    </div>
  </div>
  <div style="${S.footer}"><p style="${S.footerTxt}">© 2025 HaxFinance · Réf. ${reference}</p></div>
</div>
</body></html>`,
  };
};

// ════════════════════════════════════════════════════════════════
//  EMAIL 3 : Réponse personnalisée du conseiller au client
// ════════════════════════════════════════════════════════════════
const emailReponseConseiller = ({ client, messageConseiller, reference }) => {
  return {
    to:      client.email, // RESTE VERS LE CLIENT
    from:    `"HaxFinance" <${process.env.EMAIL_FROM}>`, // NOM DE L'ENTREPRISE ICI
    replyTo: process.env.EMAIL_REPLY_TO,
    subject: `Réponse à votre demande [${reference}] — HaxFinance`,

    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="${S.body}">
<div style="${S.wrap}">
  <div style="${S.header}">
    <div style="${S.logoTxt}">Hax<span style="${S.logoSpan}">Finance</span></div>
  </div>
  <div style="${S.body2}">
    <h1 style="${S.h1}">Bonjour ${client.prenom},</h1>
    <p style="font-size:14px;color:#07112B;line-height:1.6;margin-bottom:24px;">
      ${messageConseiller.replace(/\n/g, '<br>')}
    </p>

    <div style="background:#F4F7FC;border-radius:10px;padding:15px;margin-top:20px;border-left:4px solid #00C896;">
      <p style="font-size:12px;color:#8A9BC0;margin:0;">Votre conseiller reste à votre disposition concernant le dossier <b>${reference}</b>.</p>
    </div>

    <div style="text-align:center;margin-top:24px;border-top:1px solid #EDF0F7;padding-top:15px;">
      <p style="font-size:12px;color:#07112B;font-weight:700;">L'équipe HaxFinance</p>
      <p style="font-size:11px;color:#8A9BC0;">Direction de la relation client</p>
    </div>
  </div>
  <div style="${S.footer}"><p style="${S.footerTxt}">© 2026 HaxFinance · Sécurité & Confidentialité</p></div>
</div>
</body></html>`,
  };
};

module.exports = { emailConseiller, emailConfirmationClient, emailReponseConseiller };
