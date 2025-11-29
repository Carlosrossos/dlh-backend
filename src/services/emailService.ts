import nodemailer from 'nodemailer';

// Configuration du transporteur email
const createTransporter = () => {
  // En développement, utiliser Ethereal (fake SMTP pour tests)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || '',
        pass: process.env.ETHEREAL_PASS || '',
      },
    });
  }

  // En production, utiliser un vrai service SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Créer un compte Ethereal pour les tests (une seule fois)
export const createTestAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Compte email de test créé:');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    return testAccount;
  } catch (error) {
    console.error('Erreur création compte test:', error);
    return null;
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Dormir Là-Haut" <noreply@dormir-la-haut.fr>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);

    // En développement, afficher le lien de prévisualisation Ethereal
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email envoyé (test)');
      console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
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
