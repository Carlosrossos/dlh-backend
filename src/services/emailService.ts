import * as brevo from '@getbrevo/brevo';

// Configuration de l'API Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Si pas de clé API Brevo, mode test (pas d'envoi)
  if (!process.env.BREVO_API_KEY) {
    return true;
  }

  try {
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@dormir-la-haut.fr';
    const senderName = process.env.EMAIL_FROM_NAME || 'Dormir Là-Haut';

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: options.to }];
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;
    sendSmtpEmail.textContent = options.text || options.html.replace(/<[^>]*>/g, '');

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error: any) {
    console.error('Email error:', error?.message);
    return false;
  }
};

// Template email pour reset password
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b7355 0%, #d4a574 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #8b7355; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏔️ Dormir Là-Haut</h1>
        </div>
        <div class="content">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Bonjour ${userName},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Ce lien expire dans 1 heure.</strong><br>
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dormir Là-Haut - Tous droits réservés</p>
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Dormir Là-Haut - Réinitialisation de mot de passe
    
    Bonjour ${userName},
    
    Vous avez demandé la réinitialisation de votre mot de passe.
    
    Cliquez sur ce lien pour créer un nouveau mot de passe :
    ${resetUrl}
    
    Ce lien expire dans 1 heure.
    
    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe - Dormir Là-Haut',
    html,
    text,
  });
};

// Template email pour vérification d'inscription
export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
  userName: string
): Promise<boolean> => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b7355 0%, #d4a574 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #8b7355; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏔️ Dormir Là-Haut</h1>
        </div>
        <div class="content">
          <h2>Bienvenue ${userName} !</h2>
          <p>Merci de vous être inscrit sur Dormir Là-Haut.</p>
          <p>Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
          
          <div style="text-align: center;">
            <a href="${verifyUrl}" class="button">Vérifier mon email</a>
          </div>
          
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
            ${verifyUrl}
          </p>
          
          <div class="warning">
            <strong>⏰ Ce lien expire dans 24 heures.</strong>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dormir Là-Haut - Tous droits réservés</p>
          <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Bienvenue sur Dormir Là-Haut, ${userName} !
    
    Merci de vous être inscrit.
    
    Pour activer votre compte, cliquez sur ce lien :
    ${verifyUrl}
    
    Ce lien expire dans 24 heures.
    
    Si vous n'avez pas créé de compte, ignorez cet email.
  `;

  return sendEmail({
    to: email,
    subject: '✉️ Vérifiez votre email - Dormir Là-Haut',
    html,
    text,
  });
};

// Email notification pour modification approuvée
export const sendModificationApprovedEmail = async (
  email: string,
  userName: string,
  modificationType: string,
  poiName?: string
): Promise<boolean> => {
  const typeLabels: Record<string, string> = {
    'new_poi': 'Nouveau spot',
    'edit_poi': 'Modification de spot',
    'comment': 'Commentaire',
    'photo': 'Photo',
  };

  const typeLabel = typeLabels[modificationType] || modificationType;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 8px; text-align: center; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Contribution approuvée !</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${userName},</h2>
          <p>Bonne nouvelle ! Votre contribution a été approuvée par notre équipe.</p>
          
          <div class="success-box">
            <strong>Type :</strong> ${typeLabel}<br>
            ${poiName ? `<strong>Spot :</strong> ${poiName}` : ''}
          </div>
          
          <p style="margin-top: 20px;">Merci de contribuer à la communauté Dormir Là-Haut ! 🏔️</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dormir Là-Haut - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Bonjour ${userName},
    
    Bonne nouvelle ! Votre contribution a été approuvée.
    
    Type : ${typeLabel}
    ${poiName ? `Spot : ${poiName}` : ''}
    
    Merci de contribuer à la communauté Dormir Là-Haut !
  `;

  return sendEmail({
    to: email,
    subject: '✅ Votre contribution a été approuvée - Dormir Là-Haut',
    html,
    text,
  });
};

// Email notification pour modification refusée
export const sendModificationRejectedEmail = async (
  email: string,
  userName: string,
  modificationType: string,
  reason: string,
  poiName?: string
): Promise<boolean> => {
  const typeLabels: Record<string, string> = {
    'new_poi': 'Nouveau spot',
    'edit_poi': 'Modification de spot',
    'comment': 'Commentaire',
    'photo': 'Photo',
  };

  const typeLabel = typeLabels[modificationType] || modificationType;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Contribution non retenue</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${userName},</h2>
          <p>Malheureusement, votre contribution n'a pas pu être acceptée.</p>
          
          <p><strong>Type :</strong> ${typeLabel}</p>
          ${poiName ? `<p><strong>Spot :</strong> ${poiName}</p>` : ''}
          
          <div class="reason-box">
            <strong>Raison :</strong><br>
            ${reason}
          </div>
          
          <p style="margin-top: 20px;">N'hésitez pas à soumettre une nouvelle contribution en tenant compte de ces remarques.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dormir Là-Haut - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Bonjour ${userName},
    
    Malheureusement, votre contribution n'a pas pu être acceptée.
    
    Type : ${typeLabel}
    ${poiName ? `Spot : ${poiName}` : ''}
    
    Raison : ${reason}
    
    N'hésitez pas à soumettre une nouvelle contribution.
  `;

  return sendEmail({
    to: email,
    subject: '❌ Votre contribution n\'a pas été retenue - Dormir Là-Haut',
    html,
    text,
  });
};
