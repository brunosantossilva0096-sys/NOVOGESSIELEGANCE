// Email service - uses mailto links for simplicity in local environment
// In production, this would integrate with an email API like SendGrid, AWS SES, etc.

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: string; mimeType: string }[];
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderTotal: number;
  orderItems: { name: string; quantity: number; price: number }[];
  orderStatus: string;
  paymentMethod: string;
}

class EmailService {
  private storeName: string = 'GessiElegance';
  private storeEmail: string = 'contato@gessielegance.com.br';

  configure(storeName: string, storeEmail: string) {
    this.storeName = storeName;
    this.storeEmail = storeEmail;
  }

  // In a real app, this would send via an email API
  // For now, we simulate success and log the email
  async send(data: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate API call
      console.log('📧 Email sent:', {
        to: data.to,
        subject: data.subject,
        store: this.storeName,
        from: this.storeEmail,
      });

      // In production, integrate with:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - SMTP server

      return { success: true };
    } catch (error) {
      console.error('Send email error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  // Open mailto link for user's email client
  openMailto(data: { to: string; subject: string; body: string }): void {
    const mailtoLink = `mailto:${data.to}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
    window.open(mailtoLink, '_blank');
  }

  // Send order confirmation email
  async sendOrderConfirmation(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
    const subject = `Pedido Confirmado - ${data.orderNumber} - ${this.storeName}`;

    const itemsHtml = data.orderItems.map(item =>
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.price.toFixed(2)}</td>
      </tr>`
    ).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #007bff;">
          <h1 style="margin: 0; color: #007bff;">${this.storeName}</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #28a745;">✓ Pedido Recebido!</h2>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido foi recebido com sucesso. Agradecemos sua compra!</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalhes do Pedido</h3>
            <p><strong>Número:</strong> ${data.orderNumber}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> ${data.orderStatus}</p>
            <p><strong>Forma de Pagamento:</strong> ${data.paymentMethod}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #007bff; color: white;">
                <th style="padding: 10px; text-align: left;">Produto</th>
                <th style="padding: 10px; text-align: center;">Qtd</th>
                <th style="padding: 10px; text-align: right;">Preço</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 18px; font-weight: bold; color: #007bff;">
            Total: R$ ${data.orderTotal.toFixed(2)}
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px;">
            <p style="margin: 0;"><strong>📧 Próximos passos:</strong></p>
            <p style="margin: 5px 0 0 0;">Você receberá atualizações sobre o status do seu pedido por e-mail.</p>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Este é um e-mail automático. Por favor, não responda.</p>
          <p>© ${new Date().getFullYear()} ${this.storeName}. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    return this.send({
      to: data.customerEmail,
      subject,
      html,
    });
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(data: OrderEmailData): Promise<{ success: boolean; error?: string }> {
    const subject = `Pagamento Confirmado - ${data.orderNumber} - ${this.storeName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #28a745; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: white;">${this.storeName}</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #28a745;">💰 Pagamento Confirmado!</h2>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pagamento para o pedido <strong>${data.orderNumber}</strong> foi confirmado!</p>

          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0; font-size: 18px;"><strong>Valor Pago:</strong> R$ ${data.orderTotal.toFixed(2)}</p>
            <p style="margin: 5px 0 0 0;">Forma de pagamento: ${data.paymentMethod}</p>
          </div>

          <p>Seu pedido está sendo preparado para envio. Você receberá uma notificação quando ele for despachado.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Obrigado por comprar conosco!</p>
        </div>
      </div>
    `;

    return this.send({
      to: data.customerEmail,
      subject,
      html,
    });
  }

  // Send shipping confirmation email
  async sendShippingConfirmation(data: OrderEmailData & { trackingCode?: string; trackingUrl?: string }): Promise<{ success: boolean; error?: string }> {
    const subject = `Pedido Enviado - ${data.orderNumber} - ${this.storeName}`;

    const trackingHtml = data.trackingCode ? `
      <div style="background: #cce5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #004085;">
        <p style="margin: 0;"><strong>📦 Código de Rastreamento:</strong></p>
        <p style="margin: 5px 0; font-size: 20px; font-family: monospace; letter-spacing: 2px;">${data.trackingCode}</p>
        ${data.trackingUrl ? `<p style="margin: 5px 0 0 0;"><a href="${data.trackingUrl}" style="color: #004085;">Rastrear pedido →</a></p>` : ''}
      </div>
    ` : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #004085; padding: 20px; text-align: center;">
          <h1 style="margin: 0; color: white;">${this.storeName}</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #004085;">🚚 Pedido Enviado!</h2>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${data.orderNumber}</strong> foi enviado!</p>

          ${trackingHtml}

          <p style="margin-top: 20px;">Você pode acompanhar a entrega usando o código de rastreamento acima.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Obrigado pela preferência!</p>
        </div>
      </div>
    `;

    return this.send({
      to: data.customerEmail,
      subject,
      html,
    });
  }

  // Send password reset email
  async sendPasswordReset(email: string, name: string, resetToken: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
    const subject = `Recuperação de Senha - ${this.storeName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #007bff;">
          <h1 style="margin: 0; color: #007bff;">${this.storeName}</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">🔐 Recuperação de Senha</h2>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 15px 0;">Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
          </div>

          <p style="font-size: 12px; color: #666;">Se você não solicitou esta recuperação, ignore este e-mail.</p>
          <p style="font-size: 12px; color: #666;">O link expira em 24 horas.</p>
        </div>
      </div>
    `;

    return this.send({
      to: email,
      subject,
      html,
    });
  }

  // Send welcome email for new registrations
  async sendWelcomeEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
    const subject = `Bem-vindo à ${this.storeName}!`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white;">✨ Bem-vindo à ${this.storeName}!</h1>
        </div>

        <div style="padding: 30px 20px;">
          <h2 style="color: #333;">Olá, ${name}!</h2>
          <p>Sua conta foi criada com sucesso. Agora você pode:</p>

          <ul style="line-height: 1.8;">
            <li>💎 Comprar produtos exclusivos</li>
            <li>📦 Acompanhar seus pedidos</li>
            <li>❤️ Salvar seus favoritos</li>
            <li>🎯 Receber ofertas especiais</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Começar a Comprar</a>
          </div>
        </div>
      </div>
    `;

    return this.send({
      to: email,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
