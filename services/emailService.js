const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Masks an email address for privacy display:
 * e.g., "martha@gmail.com" -> "m***a@gmail.com"
 * e.g., "facturacion@grupoprimavera.com" -> "f***n@grupoprimavera.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;

  const [user, domain] = parts;
  if (user.length <= 2) {
    return `${user.charAt(0)}***@${domain}`;
  }
  const first = user.charAt(0);
  const last = user.charAt(user.length - 1);
  return `${first}***${last}@${domain}`;
}

/**
 * Builds HTML template for the OTP transactional email
 */
function buildOtpHtmlEmail({ otpCode, thirdPartyName, agentConfig }) {
  const razonSocial = agentConfig?.razonSocial || 'COPROPIEDAD COMERCIAL PRIMAVERA URBANA';
  const nit = agentConfig?.nit || '901003351';
  const dv = agentConfig?.dv || '2';
  const ciudad = agentConfig?.ciudad || 'Villavicencio';
  const senderEmail = agentConfig?.gworkspaceEmail || config.GWORKSPACE_EMAIL || 'contabilidad@primaveraurbana.com.co';

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificación OTP</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F4F7F6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F7F6; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            
            <!-- Header Institutional -->
            <tr>
              <td style="background-color: #234923; padding: 28px 32px; text-align: center; border-bottom: 4px solid #C5922C;">
                <h1 style="color: #ffffff; font-size: 17px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">
                  ${razonSocial}
                </h1>
                <p style="color: #DDA638; font-size: 12px; margin: 6px 0 0 0; font-weight: 600;">
                  NIT: ${nit}-${dv} • Centro Comercial y Empresarial • ${ciudad}
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 36px 36px 28px 36px;">
                <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">
                  Estimado(a) <strong>${thirdPartyName || 'Usuario'}</strong>,
                </p>
                <p style="font-size: 14px; margin: 0 0 24px 0; color: #475569; line-height: 1.5;">
                  Hemos recibido una solicitud para consultar y descargar sus certificados tributarios oficiales desde nuestro portal de autogestión. Para confirmar su identidad, utilice el siguiente código de verificación de 6 dígitos:
                </p>

                <!-- OTP Code Display Box -->
                <div style="background-color: #ebf3eb; border: 2px dashed #234923; border-radius: 12px; padding: 22px; text-align: center; margin: 0 0 24px 0;">
                  <span style="font-size: 12px; font-weight: 700; color: #234923; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
                    CÓDIGO DE SEGURIDAD OTP
                  </span>
                  <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #234923; font-family: 'Courier New', Courier, monospace;">
                    ${otpCode}
                  </div>
                  <span style="font-size: 11px; color: #B31F24; font-weight: 600; display: block; margin-top: 8px;">
                    ⏱️ Este código vence en 10 minutos (un solo uso)
                  </span>
                </div>

                <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0;">
                  Si usted no realizó esta solicitud, puede hacer caso omiso a este correo electrónico o comunicarse inmediatamente con nuestro departamento de contabilidad.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #F4F7F6; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">
                  <strong>Primavera Urbana Centro Comercial y Empresarial</strong>
                </p>
                <p style="font-size: 10.5px; color: #94a3b8; margin: 0;">
                  Correo: ${senderEmail} • Tel: 310 689 0750 • Villavicencio (Meta)
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sends OTP email using Google Workspace (primaveraurbana.com.co)
 * Sender: contabilidad@primaveraurbana.com.co
 * SMTP: smtp.gmail.com / Port 465 (SSL)
 * Real delivery to the third party's registered email address.
 */
async function sendOtpEmail({ to, otpCode, thirdPartyName, agentConfig }) {
  const maskedEmail = maskEmail(to);

  const senderEmail = (agentConfig && agentConfig.gworkspaceEmail) || config.GWORKSPACE_EMAIL || 'contabilidad@primaveraurbana.com.co';
  const appPassword = (agentConfig && agentConfig.gworkspaceAppPassword) || config.GWORKSPACE_APP_PASSWORD || process.env.GWORKSPACE_APP_PASSWORD || '';
  const smtpHost = (agentConfig && agentConfig.gworkspaceSmtpHost) || config.GWORKSPACE_SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt((agentConfig && agentConfig.gworkspaceSmtpPort) || config.GWORKSPACE_SMTP_PORT || 465, 10);
  const fromName = config.GWORKSPACE_FROM_NAME || 'Primavera Urbana - Contabilidad';

  if (!to || !to.includes('@')) {
    return {
      success: false,
      error: 'INVALID_RECIPIENT_EMAIL',
      message: 'La dirección de correo electrónico del destinatario no es válida.'
    };
  }

  // Enforce configuration of Google Workspace App Password for real delivery
  if (!appPassword || appPassword.trim().length === 0) {
    const errorMsg = 'El servicio de correo corporativo Google Workspace no tiene configurada la Contraseña de Aplicación de 16 caracteres. Para emitir correos reales desde contabilidad@primaveraurbana.com.co, ingrese la contraseña en el Panel de Administración (/admin > Configuración).';
    console.error(`[Google Workspace SMTP] ❌ ${errorMsg}`);
    return {
      success: false,
      error: 'GWORKSPACE_NOT_CONFIGURED',
      message: errorMsg,
      maskedEmail
    };
  }

  const htmlBody = buildOtpHtmlEmail({ otpCode, thirdPartyName, agentConfig });

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: senderEmail.trim(),
        pass: appPassword.trim().replace(/\s+/g, '') // Google App Passwords can have 16 letters with or without spaces
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${fromName}" <${senderEmail.trim()}>`,
      to: to.trim(),
      subject: `${otpCode} es su código de verificación - Primavera Urbana`,
      html: htmlBody
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Google Workspace SMTP] ✓ Correo enviado exitosamente a ${to} (${maskedEmail}) desde ${senderEmail} (ID: ${info.messageId})`);
    return {
      success: true,
      mode: 'google_workspace_real',
      maskedEmail,
      messageId: info.messageId,
      to: to.trim()
    };
  } catch (err) {
    console.error(`[Google Workspace SMTP] ❌ Error al enviar correo a ${to} desde ${senderEmail}:`, err.message);
    return {
      success: false,
      error: 'SMTP_SEND_FAILED',
      message: `No fue posible despachar el correo de verificación desde contabilidad@primaveraurbana.com.co (${err.message}). Verifique la contraseña de aplicación o permisos de la cuenta Google.`,
      details: err.message,
      maskedEmail
    };
  }
}

/**
 * Diagnostic test utility to verify Google Workspace SMTP connection
 */
async function testSmtpConnection({ senderEmail, appPassword, smtpHost, smtpPort, testRecipient, agentConfig }) {
  const host = smtpHost || 'smtp.gmail.com';
  const port = parseInt(smtpPort || 465, 10);
  const user = (senderEmail || 'contabilidad@primaveraurbana.com.co').trim();
  const pass = (appPassword || '').trim().replace(/\s+/g, '');
  const to = (testRecipient || user).trim();
  const fromName = config.GWORKSPACE_FROM_NAME || 'Primavera Urbana - Contabilidad';

  if (!pass) {
    throw new Error('Debe ingresar la Contraseña de Aplicación de 16 caracteres de Google Workspace.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  // Verify connection configuration
  await transporter.verify();

  // Send a real diagnostic test email
  const info = await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to,
    subject: 'Prueba de Conexión Exitosa - Google Workspace Primavera Urbana',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #F4F7F6; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: #234923; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 16px;">PRUEBA DE CONEXIÓN GOOGLE WORKSPACE</h2>
            <p style="margin: 4px 0 0; color: #DDA638; font-size: 12px;">Primavera Urbana Centro Comercial y Empresarial</p>
          </div>
          <div style="padding: 24px;">
            <p style="color: #234923; font-weight: bold; font-size: 14px; margin-top: 0;">✓ Conexión SMTP Establecida con Éxito</p>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">
              Este es un correo de prueba enviado desde <strong>${user}</strong> a través de <strong>smtp.gmail.com:465 (SSL)</strong>. El portal de certificados tributarios está listo para enviar códigos de verificación OTP reales a proveedores y colaboradores.
            </p>
            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">Fecha y hora: ${new Date().toLocaleString('es-CO')}</p>
          </div>
        </div>
      </div>
    `
  });

  return {
    success: true,
    messageId: info.messageId,
    recipient: to,
    sender: user
  };
}

module.exports = {
  maskEmail,
  sendOtpEmail,
  testSmtpConnection
};
