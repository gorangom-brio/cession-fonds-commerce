/**
 * Générateur de contrat PDF
 * Utilise @react-pdf/renderer pour créer un PDF professionnel
 */

import { ContractData } from "./types";

/**
 * Génère le contenu HTML du contrat (ensuite convertible en PDF)
 * Utilisé côté serveur ou client selon le contexte
 */
export function generateContractHTML(data: ContractData): string {
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handoverDate = new Date(data.handover_date);
  const formattedDate = dateFormatter.format(handoverDate);

  const priceFR = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(data.sale_price);

  const includedList = data.included_elements
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const excludedList = data.excluded_elements
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const leaseInfo =
    data.lease.end_date && data.lease.monthly_rent
      ? `
      <h3>6. BAIL COMMERCIAL</h3>
      <p>
        <strong>Bailleur :</strong> ${escapeHtml(data.lease.landlord || "À préciser")}<br>
        <strong>Loyer mensuel :</strong> ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
        }).format(data.lease.monthly_rent || 0)} HT<br>
        <strong>Date d'expiration du bail :</strong> ${new Date(data.lease.end_date).toLocaleDateString("fr-FR")}
      </p>
      <p>
        Le preneur reprenanteur déclare accepter le bail existant aux conditions 
        énoncées ci-dessus et prend l'engagement de respecter l'intégralité des 
        clauses y figurant.
      </p>
    `
      : "";

  const financesInfo =
    data.financials.revenue_year1 || data.financials.revenue_year2
      ? `
      <h3>7. ÉLÉMENTS FINANCIERS</h3>
      <p>
        <strong>Chiffre d'affaires :</strong><br>
        ${data.financials.revenue_year1 ? `• Année N : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(data.financials.revenue_year1)}<br>` : ""}
        ${data.financials.revenue_year2 ? `• Année N-1 : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(data.financials.revenue_year2)}<br>` : ""}
        ${data.financials.revenue_year3 ? `• Année N-2 : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(data.financials.revenue_year3)}` : ""}
      </p>
    `
      : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Cession de Fonds de Commerce</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 60px 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      border-top: 4px solid #1e3070;
      border-bottom: 1px solid #ddd;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      color: #1e3070;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    .disclaimer-box {
      background-color: #fef3cd;
      border: 2px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #856404;
    }
    
    .disclaimer-box strong {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .footer-disclaimer {
      background-color: #fff3cd;
      border-top: 2px solid #ffc107;
      padding: 20px;
      margin-top: 40px;
      font-size: 12px;
      color: #654321;
      page-break-inside: avoid;
    }
    
    h2 {
      font-size: 18px;
      color: #1e3070;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 10px;
      font-weight: bold;
    }
    
    h3 {
      font-size: 15px;
      color: #333;
      margin-top: 20px;
      margin-bottom: 12px;
      font-weight: bold;
    }
    
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    .party-box {
      background-color: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #1e3070;
      margin: 15px 0;
      border-radius: 2px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .signature-section {
      margin-top: 60px;
      page-break-inside: avoid;
    }
    
    .signature-box {
      display: inline-block;
      width: 45%;
      vertical-align: top;
      margin-right: 5%;
    }
    
    .signature-box-right {
      display: inline-block;
      width: 45%;
      vertical-align: top;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 10px;
      font-size: 13px;
    }
    
    .generated-info {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      color: rgba(255, 0, 0, 0.1);
      z-index: -1;
      pointer-events: none;
    }
    
    strong {
      font-weight: bold;
    }
    
    @media print {
      body {
        background-color: white;
      }
      .container {
        box-shadow: none;
        padding: 40px;
      }
    }
  </style>
</head>
<body>
  <div class="watermark">PROJET - NON DÉFINITIF</div>
  
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>CONTRAT DE CESSION DE FONDS DE COMMERCE</h1>
      <p style="color: #666; font-size: 14px;">Généré le ${dateFormatter.format(new Date(data.generated_at))}</p>
    </div>
    
    <!-- DISCLAIMER PRINCIPAL -->
    <div class="disclaimer-box">
      <strong>⚠️ AVERTISSEMENT JURIDIQUE</strong>
      <p>
        <strong>CE DOCUMENT EST UN PROJET - NON DÉFINITIF</strong><br>
        Cet avant-contrat a été généré automatiquement par l'application Cession Fonds Commerce. 
        Il constitue une aide à la rédaction et ne remplace en aucun cas le conseil d'un avocat ou d'un notaire.<br><br>
        <strong>CETTE CESSION NE PEUT ÊTRE FINALISÉE QUE SOUS VALIDATION D'UN PROFESSIONNEL DU DROIT.</strong>
        Les parties s'engagent à soumettre ce contrat à un avocat ou notaire avant toute signature définitive.
      </p>
    </div>
    
    <!-- PARTIES -->
    <h2>1. LES PARTIES</h2>
    
    <h3>Vendeur (Cédant)</h3>
    <div class="party-box">
      <p>
        <strong>Nom :</strong> ${escapeHtml(data.vendor.fullname)}<br>
        <strong>Adresse :</strong> ${escapeHtml(data.vendor.address)}<br>
        ${data.vendor.siret ? `<strong>SIRET :</strong> ${escapeHtml(data.vendor.siret)}<br>` : ""}
      </p>
    </div>
    
    <h3>Acheteur (Preneur)</h3>
    <div class="party-box">
      <p>
        <strong>Nom :</strong> ${escapeHtml(data.buyer.fullname)}<br>
        <strong>Adresse :</strong> ${escapeHtml(data.buyer.address)}<br>
        ${data.buyer.siret ? `<strong>SIRET :</strong> ${escapeHtml(data.buyer.siret)}<br>` : ""}
      </p>
    </div>
    
    <!-- FONDS DE COMMERCE -->
    <h2>2. LE FONDS DE COMMERCE CÉDÉ</h2>
    
    <p>
      <strong>Dénomination :</strong> ${escapeHtml(data.business.name)}<br>
      <strong>Activité principale :</strong> ${escapeHtml(data.business.activity)}<br>
      <strong>Adresse du siège :</strong> ${escapeHtml(data.business.address)}
    </p>
    
    <!-- PRIX ET MODALITÉS -->
    <h2>3. PRIX ET MODALITÉS DE PAIEMENT</h2>
    
    <p>
      Le prix de cession du fonds de commerce est fixé à : <strong>${priceFR}</strong> (montant en chiffres).
    </p>
    
    <h3>Modalités de paiement</h3>
    <p>${escapeHtml(data.payment_terms)}</p>
    
    <!-- ENTRÉE EN JOUISSANCE -->
    <h2>4. ENTRÉE EN JOUISSANCE</h2>
    
    <p>
      L'acheteur entrera en jouissance du fonds de commerce le <strong>${formattedDate}</strong>.
    </p>
    
    <!-- ÉLÉMENTS INCLUS/EXCLUS -->
    <h2>5. ÉLÉMENTS INCLUS ET EXCLUS</h2>
    
    <h3>Éléments inclus dans la cession</h3>
    <ul>
      ${includedList}
    </ul>
    
    <h3>Éléments exclus</h3>
    <ul>
      ${excludedList}
    </ul>
    
    <!-- BAIL (optionnel) -->
    ${leaseInfo}
    
    <!-- FINANCES (optionnel) -->
    ${financesInfo}
    
    <!-- RESPONSABILITÉS -->
    <h2>8. RESPONSABILITÉS</h2>
    
    <h3>Dettes et créances</h3>
    <p>
      Le vendeur garantit que le fonds de commerce cédé n'est grevé d'aucune hypothèque ou nantissement.
      L'acheteur reprend le passif afférent à l'exploitation du fonds selon les usages commerciaux.
    </p>
    
    <h3>Garantie d'exploitation</h3>
    <p>
      Le vendeur confirme que le fonds de commerce peut être exploité librement et conforme aux réglementations 
      en vigueur (normes d'hygiène, de sécurité, etc.).
    </p>
    
    <!-- CONFIDENTIALITÉ -->
    <h2>9. CONFIDENTIALITÉ</h2>
    
    <p>
      Les parties s'engagent à maintenir confidentiels les termes de cette cession, sauf disposition légale imposant 
      la divulgation ou communication à des tiers professionnels (notaire, avocat, banquier, expert-comptable).
    </p>
    
    <!-- RÉSILIATION -->
    <h2>10. RÉSILIATION</h2>
    
    <p>
      Toute modification ou résiliation de ce contrat doit faire l'objet d'un accord écrit signé par les deux parties 
      et validé par un professionnel du droit.
    </p>
    
    <!-- SIGNAUTRES -->
    <div class="signature-section">
      <h2>SIGNATURES</h2>
      
      <div class="signature-box">
        <p><strong>Vendeur</strong></p>
        <p style="margin-top: 40px; font-size: 13px;">
          Fait à _____________, le ________________<br><br><br>
          Signature : _______________________<br>
          Nom et prénom (lisibles) : _____________________
        </p>
      </div>
      
      <div class="signature-box-right">
        <p><strong>Acheteur</strong></p>
        <p style="margin-top: 40px; font-size: 13px;">
          Fait à _____________, le ________________<br><br><br>
          Signature : _______________________<br>
          Nom et prénom (lisibles) : _____________________
        </p>
      </div>
    </div>
    
    <!-- FOOTER DISCLAIMER -->
    <div class="footer-disclaimer">
      <strong>RAPPEL LÉGAL IMPORTANT</strong><br>
      Ce contrat a été généré par l'application Cession Fonds Commerce et n'a aucune valeur juridique 
      avant sa validation et signature par un avocat ou un notaire. 
      La cession de fonds de commerce est un acte juridique complexe soumis à des obligations légales et fiscales 
      spécifiques. Les parties DOIVENT consulter un professionnel du droit avant toute signature définitive.<br><br>
      <strong>Cette application décline toute responsabilité en cas de non-respect de cette obligation.</strong>
    </div>
    
    <div class="generated-info">
      Généré par Cession Fonds Commerce • Application d'aide à la rédaction<br>
      Vous devez faire valider ce document par un avocat ou notaire
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Crée un blob PDF à partir du HTML
 * À utiliser côté client avec html2pdf ou similaire
 */
export function createPdfBlob(htmlContent: string): Blob {
  return new Blob([htmlContent], { type: "text/html" });
}

/**
 * Génère un nom de fichier pour le contrat
 */
export function generateContractFilename(businessName: string): string {
  const sanitized = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const date = new Date().toISOString().split("T")[0];
  return `contrat-cession-${sanitized}-${date}.pdf`;
}
