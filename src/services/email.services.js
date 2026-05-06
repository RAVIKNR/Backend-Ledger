require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require("crypto");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration


transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function RegistrationEmail(useremail, name) {

  const logoUrl = "https://th.bing.com/th/id/OIP.fTPWjMsqkNzCWGdxTI8jkgHaHZ";

  const subject = "Welcome to HDFC Bank - Account Confirmation";

  const text = `Dear ${name}, your account has been successfully created.`;

  const html = `
<div style="margin:0; padding:0; background:#ffffff; font-family:Arial, sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="border:1px solid #ccc; padding:20px;">

          <!-- Logo -->
          <tr>
            <td style="text-align:left;">
              <img src="${logoUrl}" width="140"/>
            </td>
          </tr>

          <!-- Date -->
          <tr>
            <td style="font-size:12px; color:#333; padding-top:10px;">
              Date: ${new Date().toLocaleDateString("en-IN")}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top:20px; font-size:14px; color:#000; line-height:1.6;">
              
              <p>Dear ${name},</p>

              <p>
                Welcome to HDFC Bank and thank you for choosing us.
              </p>

              <p>
                We are pleased to inform you that your account has been successfully created.
              </p>

              <p>
                You can now access your account and perform transactions securely.
              </p>

              <p>
                If you have any queries or require assistance, please contact our customer care.
              </p>

              <br/>

              <p>
                Warm Regards,<br/>
                <strong>HDFC Bank</strong>
              </p>

              <br/>

              <p style="font-size:12px; color:#555;">
                This is a system generated email and does not require any signature.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #ccc; padding-top:10px; font-size:11px; color:#666;">
              HDFC BANK LTD.<br/>
              Registered Office: India
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</div>
`;

  await sendEmail(useremail, subject, text, html);
}

async function loginDetected(useremail, name) {

  const logoUrl = "https://th.bing.com/th/id/OIP.fTPWjMsqkNzCWGdxTI8jkgHaHZ";

  const subject = "HDFC Bank: Login Activity Alert";

  const text = `Dear ${name}, a login to your account was detected. If not you, contact support immediately.`;

  const html = `
<div style="margin:0; padding:0; background:#ffffff; font-family:Arial, sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="border:1px solid #ccc; padding:20px;">

          <!-- Logo -->
          <tr>
            <td style="text-align:left;">
              <img src="${logoUrl}" width="140"/>
            </td>
          </tr>

          <!-- Date -->
          <tr>
            <td style="font-size:12px; color:#333; padding-top:10px;">
              Date: ${new Date().toLocaleDateString("en-IN")}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top:20px; font-size:14px; color:#000; line-height:1.6;">
              
              <p>Dear ${name},</p>

              <p>
                We wish to inform you that a login to your account has been detected with the following details:
              </p>

              <p>
                <strong>Login Details:</strong><br/>
                Date & Time: ${new Date().toLocaleString("en-IN")}<br/>
                Location: India (Approximate)<br/>
                Device: Unknown Device
              </p>

              <p>
                If this activity has been performed by you, no further action is required.
              </p>

              <p>
                If you do not recognize this login, we request you to immediately change your password and contact our customer care.
              </p>

              <p style="color:#000; font-weight:bold;">
                Please do not share your login credentials or OTP with anyone.
              </p>

              <br/>

              <p>
                Warm Regards,<br/>
                <strong>HDFC Bank</strong>
              </p>

              <br/>

              <p style="font-size:12px; color:#555;">
                This is a system generated email and does not require any signature.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #ccc; padding-top:10px; font-size:11px; color:#666;">
              HDFC BANK LTD.<br/>
              Registered Office: India
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</div>
`;

  await sendEmail(useremail, subject, text, html);
}

async function accountCreated(useremail, name) {
  const subject = "Account Creation Confirmation";

  const html = `
<div style="font-family: Arial, sans-serif; background:#ffffff; padding:40px; color:#222;">
  
  <!-- Header -->
  <table width="100%" style="margin-bottom:30px;">
    <tr>
      <td align="left">
        <img src="https://tse3.mm.bing.net/th/id/OIP.PWa2XnI7eOhZREqGR9M2vQHaE8?w=768&h=512&rs=1&pid=ImgDetMain&o=7&rm=3"
             height="50"><br/>
        <span style="font-size:13px; color:#555;">We understand your world</span>
      </td>
      <td align="right" style="font-size:13px;">
        Date: ${new Date().toLocaleDateString("en-IN")}
      </td>
    </tr>
  </table>

  <!-- Greeting -->
  <p style="margin-bottom:25px;"><strong>Dear ${name},</strong></p>

  <!-- Subject -->
  <p style="margin-bottom:20px;">
    <strong>Sub: Account Creation Confirmation</strong>
  </p>

  <!-- Body -->
  <p style="margin-bottom:15px;">
    This is to inform you that your account has been successfully created with our bank.
  </p>

  <p style="margin-bottom:15px;">
    You are now authorized to access banking services and perform transactions securely.
  </p>

  <p style="margin-bottom:15px;">
    If you have not initiated this request, please contact us immediately.
  </p>

  <p style="margin-bottom:30px;">
    Thank you for your cooperation.
  </p>

  <!-- Signature -->
  <p>
    Yours sincerely,<br/><br/>
    <strong>Authorized Signatory</strong>
  </p>

  <br/><br/>

  <!-- Footer -->
  <hr style="margin:30px 0; border:0; border-top:1px solid #999;">

  <p style="font-size:12px; color:#444; text-align:center;">
    HDFC BANK LTD.<br/>
    Customer Support: support@hdfcbank.com | www.hdfcbank.com
  </p>

</div>
`;

  await sendEmail(useremail, subject, "", html);
}

async function debittransactionMail({
  email,
  name,
  amount,
  type, // "DEBIT" | "CREDIT"
  balance,
  toAccount
}) {

  const transactionId = "TXN" + Date.now();

  const date = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  const maskedAcc = "XXXX" + String(toAccount).slice(-4);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);

  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(balance);

  // ✅ Normalize type (important)
  const normalizedType = String(type).toUpperCase();

  // ✅ Correct color logic
  const color = normalizedType === "DEBIT" ? "#e53935" : "#2e7d32";

  const subject = `${formattedAmount} ${normalizedType} Alert | A/C ${maskedAcc}`;

  const text = `
Dear ${name},

We wish to inform you that a ${normalizedType} transaction has been processed on your account.

Transaction Details:
- Amount: ${formattedAmount}
- Transaction ID: ${transactionId}
- Date & Time: ${date}
- Account: ${maskedAcc}
- Available Balance: ${formattedBalance}

If you did not initiate this transaction, please contact our customer care immediately.

Warm regards,  
Your Bank
`;

  const html = `
<div style="margin:0; padding:0; background:#f4f6f9; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">

        <table width="600" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#ffffff; padding:20px; text-align:center; border-bottom:3px solid #e53935;">
              
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg" 
                alt="Bank Logo"
                style="height:50px; margin-bottom:10px;"
              />

              <p style="margin:0; color:#666; font-size:14px;">
                Secure Banking Notification
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px; color:#333;">

              <p style="font-size:15px;">Dear <b>${name}</b>,</p>

              <p style="font-size:15px;">
                A <b style="color:${color};">${normalizedType}</b> transaction has been successfully processed on your account.
              </p>

              <!-- AMOUNT -->
              <div style="text-align:center; margin:30px 0;">
                <span style="font-size:34px; font-weight:bold; color:${color};">
                  ${formattedAmount}
                </span>
              </div>

              <!-- DETAILS -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafc; border-radius:8px; font-size:14px;">
                <tr>
                  <td><b>Transaction ID</b></td>
                  <td align="right">${transactionId}</td>
                </tr>
                <tr>
                  <td><b>Date & Time</b></td>
                  <td align="right">${date}</td>
                </tr>
                <tr>
                  <td><b>Account</b></td>
                  <td align="right">${maskedAcc}</td>
                </tr>
                <tr>
                  <td><b>Type</b></td>
                  <td align="right">${normalizedType}</td>
                </tr>
                <tr>
                  <td><b>Available Balance</b></td>
                  <td align="right">${formattedBalance}</td>
                </tr>
              </table>

              <!-- ALERT -->
              <p style="margin-top:25px; color:#e53935; font-weight:bold; font-size:14px;">
                If you did not authorize this transaction, please contact customer care immediately.
              </p>

              <p style="margin-top:30px; font-size:14px;">
                Regards,<br/>
                <b>Your Bank</b>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f1f3f6; padding:15px; text-align:center; font-size:12px; color:#777;">
              This is an automated email. Please do not reply.<br/>
              © 2026 Your Bank. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`;

  await sendEmail(email, subject, text, html);
}

async function creditTransactionMail({
  email,
  name,
  amount,
  balance,
  fromAccount
}) {

  const transactionId = "TXN" + Date.now();

  const date = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  const maskedAcc = "XXXX" + String(fromAccount).slice(-4);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);

  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(balance);

  const subject = `${formattedAmount} credited to A/c ${maskedAcc}`;

  const text = `
Dear ${name},

We wish to inform you that an amount of ${formattedAmount} has been credited to your account.

Transaction Details:
- Transaction ID: ${transactionId}
- Date & Time: ${date}
- Account: ${maskedAcc}
- Available Balance: ${formattedBalance}

If you were not expecting this credit, please verify with the sender.

Warm regards,  
Your Bank
`;

  const html = `
<div style="margin:0; padding:0; background:#f4f6f9; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">

        <table width="600" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#ffffff; padding:20px; text-align:center; border-bottom:3px solid #2e7d32;">
              
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg" 
                alt="Bank Logo"
                style="height:50px; margin-bottom:10px;"
              />

              <p style="margin:0; color:#666; font-size:14px;">
                Credit Transaction Alert
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px; color:#333;">

              <p style="font-size:15px;">Dear <b>${name}</b>,</p>

              <p style="font-size:15px;">
                An amount of <b style="color:#2e7d32;">${formattedAmount}</b> has been successfully credited to your account.
              </p>

              <!-- AMOUNT -->
              <div style="text-align:center; margin:30px 0;">
                <span style="font-size:34px; font-weight:bold; color:#2e7d32;">
                  ${formattedAmount}
                </span>
              </div>

              <!-- DETAILS -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafc; border-radius:8px; font-size:14px;">
                <tr>
                  <td><b>Transaction ID</b></td>
                  <td align="right">${transactionId}</td>
                </tr>
                <tr>
                  <td><b>Date & Time</b></td>
                  <td align="right">${date}</td>
                </tr>
                <tr>
                  <td><b>Account</b></td>
                  <td align="right">${maskedAcc}</td>
                </tr>
                <tr>
                  <td><b>Transaction Type</b></td>
                  <td align="right">CREDIT</td>
                </tr>
                <tr>
                  <td><b>Available Balance</b></td>
                  <td align="right">${formattedBalance}</td>
                </tr>
              </table>

              <p style="margin-top:25px; font-size:14px;">
                Please retain this email for your records.
              </p>

              <p style="margin-top:30px; font-size:14px;">
                Regards,<br/>
                <b>Your Bank</b>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f1f3f6; padding:15px; text-align:center; font-size:12px; color:#777;">
              This is an automated email. Please do not reply.<br/>
              © 2026 Your Bank. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`;

  await sendEmail(email, subject, text, html);
}

async function initiatefunding(
  name,
  amount,
  toAccount,
  email,
  transactionId,
  balance
) {

  const date = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata"
  });

  const maskedAcc = "XXXX" + String(toAccount).slice(-4);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);

  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(balance);

  const subject = `${formattedAmount} credited to your A/c ${maskedAcc}`;

  const html = `
<div style="font-family: Arial, sans-serif; background:#ffffff; padding:40px; color:#222; line-height:1.7;">

  <!-- Header -->
  <table width="100%" style="margin-bottom:40px;">
    <tr>
      <td align="left">
        <img src="https://tse3.mm.bing.net/th/id/OIP.PWa2XnI7eOhZREqGR9M2vQHaE8?w=768&h=512&rs=1&pid=ImgDetMain&o=7&rm=3"
             height="50"><br/>
        <span style="font-size:13px; color:#555;">We understand your world</span>
      </td>
      <td align="right" style="font-size:13px;">
        Date: ${date}
      </td>
    </tr>
  </table>

  <!-- Greeting -->
  <p style="margin-bottom:25px;"><strong>Dear ${name},</strong></p>

  <!-- Subject -->
  <p style="margin-bottom:20px;">
    <strong>Sub: CREDIT OF FUNDS TO YOUR ACCOUNT</strong>
  </p>

  <!-- Body -->
  <p style="margin-bottom:15px;">
    This is to inform you that an amount of <strong>${formattedAmount}</strong> has been credited to your account bearing number <strong>${maskedAcc}</strong>.
  </p>

  <p style="margin-bottom:15px;">
    The transaction has been successfully processed and the details are provided below for your reference.
  </p>

  <!-- Table -->
  <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse; margin:20px 0;">
    <tr>
      <td style="border:1px solid #ccc;"><strong>Transaction ID</strong></td>
      <td style="border:1px solid #ccc;">${transactionId}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;"><strong>Date & Time</strong></td>
      <td style="border:1px solid #ccc;">${date}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;"><strong>Transaction Type</strong></td>
      <td style="border:1px solid #ccc;">CREDIT</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;"><strong>Amount</strong></td>
      <td style="border:1px solid #ccc;">${formattedAmount}</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;"><strong>Available Balance</strong></td>
      <td style="border:1px solid #ccc;">${formattedBalance}</td>
    </tr>
  </table>

  <p style="margin-bottom:15px;">
    Kindly verify the above details and retain this communication for your records.
  </p>

  <p style="margin-bottom:15px;">
    If you have not authorized this transaction, please contact the bank immediately.
  </p>

  <p style="margin-bottom:30px;">
    We appreciate your continued trust in our banking services.
  </p>

  <!-- Signature -->
  <p>
    Yours faithfully,<br/><br/>
    <strong>Authorized Signatory</strong><br/>
    (Operations Department)
  </p>

  <!-- Footer -->
  <hr style="margin:30px 0; border:0; border-top:1px solid #999;">

  <p style="font-size:12px; text-align:center; color:#555;">
    HDFC Bank Ltd.<br/>
    Customer Care: support@hdfcbank.com | www.hdfcbank.com
  </p>

</div>
`;

  await sendEmail(email, subject, "", html);
}




module.exports = {RegistrationEmail, loginDetected ,debittransactionMail,creditTransactionMail, accountCreated , initiatefunding};