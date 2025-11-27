const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Generate invoice HTML
   * @param {Object} invoiceData
   * @returns {string}
   */
  generateInvoiceHTML(invoiceData) {
    const {
      orderNumber,
      schoolName,
      packageName,
      studentCount,
      mentorCount,
      durationMonths,
      pricePerMonth,
      totalAmount,
      paymentDate,
      paymentMethod,
    } = invoiceData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .invoice-table th, .invoice-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .invoice-table th { background: #f2f2f2; font-weight: bold; }
          .total { font-size: 18px; font-weight: bold; color: #4CAF50; }
          .footer { text-align: center; padding: 20px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>INVOICE PEMBAYARAN</h1>
            <p>Platform Pembelajaran Swara</p>
          </div>
          <div class="content">
            <p><strong>No. Invoice:</strong> ${orderNumber}</p>
            <p><strong>Tanggal Pembayaran:</strong> ${paymentDate}</p>
            <p><strong>Metode Pembayaran:</strong> ${paymentMethod}</p>
            
            <h3>Detail Sekolah</h3>
            <p><strong>Nama Sekolah:</strong> ${schoolName}</p>
            
            <h3>Detail Paket</h3>
            <table class="invoice-table">
              <tr>
                <th>Keterangan</th>
                <th>Detail</th>
              </tr>
              <tr>
                <td>Paket Dipilih</td>
                <td>${packageName}</td>
              </tr>
              <tr>
                <td>Jumlah Siswa</td>
                <td>${studentCount} siswa</td>
              </tr>
              <tr>
                <td>Jumlah Guru Mentor</td>
                <td>${mentorCount} mentor</td>
              </tr>
              <tr>
                <td>Durasi Berlangganan</td>
                <td>${durationMonths} bulan</td>
              </tr>
              <tr>
                <td>Harga per Bulan</td>
                <td>Rp ${pricePerMonth.toLocaleString("id-ID")}</td>
              </tr>
              <tr class="total">
                <td>TOTAL PEMBAYARAN</td>
                <td>Rp ${totalAmount.toLocaleString("id-ID")}</td>
              </tr>
            </table>
            
            <p>Terima kasih atas pembayaran Anda. Akses Anda telah diaktifkan dan dapat digunakan segera.</p>
          </div>
          <div class="footer">
            <p>Platform Pembelajaran Swara | Email: support@swara.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send school registration email with credentials
   * @param {Object} emailData
   * @returns {Promise<Object>}
   */
  async sendSchoolCredentials(emailData) {
    try {
      console.log("📧 Starting email send process...");
      console.log("Email config check:", {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        passwordLength: process.env.EMAIL_PASSWORD?.length,
      });

      const { to, picName, schoolName, email, password, token, invoiceData } =
        emailData;

      console.log("Sending email to:", to);

      const invoiceHTML = this.generateInvoiceHTML(invoiceData);

      const mailOptions = {
        from: `"Swara Platform" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: "Selamat Datang di Platform Swara - Kredensial Login Sekolah",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #F07122; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { padding: 20px; background: #f9f9f9; }
              .credentials { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #F07122; }
              .credentials p { margin: 10px 0; }
              .important { color: #d32f2f; font-weight: bold; }
              .button { display: inline-block; padding: 12px 30px; background: #F07122; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Selamat Datang di Platform Swara!</h1>
              </div>
              <div class="content">
                <h2>Halo ${picName},</h2>
                <p>Selamat! Registrasi <strong>${schoolName}</strong> sebagai Sekolah Mitra telah berhasil.</p>
                
                <p>Pembayaran Anda telah dikonfirmasi. Berikut adalah kredensial untuk login sebagai Admin Sekolah:</p>
                
                <div class="credentials">
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Password:</strong> ${password}</p>
                  <p><strong>Token Sekolah:</strong> ${token}</p>
                </div>
                
                <p class="important">⚠️ PENTING: Simpan kredensial ini dengan aman! Token sekolah diperlukan untuk siswa yang ingin bergabung dengan akun sekolah Anda.</p>
                
                <h3>Cara Login:</h3>
                <ol>
                  <li>Buka aplikasi Platform Swara</li>
                  <li>Pilih "Login sebagai Admin Sekolah"</li>
                  <li>Masukkan email, password, dan token sekolah</li>
                </ol>
                
                <h3>Token untuk Siswa:</h3>
                <p>Siswa dapat mendaftar dengan menggunakan token sekolah: <strong>${token}</strong></p>
                <p>Setelah siswa mendaftar dengan token ini, mereka akan otomatis terhubung dengan akun sekolah Anda.</p>
                
                <a href="${
                  process.env.APP_URL || "https://swara.com"
                }" class="button" style="display: inline-block; padding: 12px 30px; background: #F07122; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login Sekarang</a>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <h3>Invoice Pembayaran:</h3>
                ${invoiceHTML}
                
                <p>Jika ada pertanyaan, silakan hubungi tim support kami.</p>
              </div>
              <div class="footer">
                <p>Platform Pembelajaran Swara</p>
                <p>Email: support@swara.com | Website: www.swara.com</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      console.log("📨 Sending email with nodemailer...");
      const info = await this.transporter.sendMail(mailOptions);

      console.log("✅ Email sent successfully!");
      console.log("Message ID:", info.messageId);
      console.log("Response:", info.response);

      return {
        success: true,
        messageId: info.messageId,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error("Email send error:", error);
      throw new Error("Failed to send email: " + error.message);
    }
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
