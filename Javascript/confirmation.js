const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin SDK (required to access Firestore from functions)
admin.initializeApp();

// --- Replace with your chosen email sending library setup ---
// Example using Nodemailer (for illustrative purposes, production might use SendGrid etc.)
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    service: "gmail", // or your SMTP details
    auth: {
        user: functions.config().email.user, // Store securely in Firebase Environment Config
        pass: functions.config().email.password // Store securely in Firebase Environment Config
    }
});
// -------------------------------------------------------------

// Cloud Function triggered on new document creation in 'contact_submissions'
exports.sendContactEmail = functions.firestore
    .document("contact_submissions/{docId}")
    .onCreate(async (snap, context) => {
        const newSubmission = snap.data(); // Get the data from the new document

        const senderName = newSubmission.name;
        const senderEmail = newSubmission.email;
        const messageContent = newSubmission.message;
        const submissionTime = newSubmission.timestamp.toDate().toLocaleString();

        const mailOptions = {
            from: "Your Website <your-email@yourdomain.com>", // Your verified sending email
            to: "client-email@yourdomain.com", // The client's email address
            subject: `New Inquiry from Wheelz AI - ${senderName}`,
            html: `
                <p>You have received a new inquiry from your website:</p>
                <p><strong>Name:</strong> ${senderName}</p>
                <p><strong>Email:</strong> ${senderEmail}</p>
                <p><strong>Message:</strong></p>
                <p>${messageContent}</p>
                <p><em>Submitted at: ${submissionTime}</em></p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log("Email sent successfully!");
            return null; // Return null to indicate successful completion
        } catch (error) {
            console.error("Error sending email:", error);
            // You might want to log this error or send a notification to yourself
            return null; // Still return null, as the function itself didn't crash
        }
    });