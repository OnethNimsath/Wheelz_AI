/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
// Uncomment these lines if you plan to use HTTP functions or logging in
// other functions
// const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (required to access Firestore from functions)
admin.initializeApp();

// --- Email Sending Setup ---
// IMPORTANT: For production, consider using a dedicated email service like
// SendGrid, Mailgun, or Resend. Nodemailer with Gmail is shown here for
// simplicity during development/testing. If using Gmail, you'll likely
// need to generate an "App Password" for your Google account if you have
// 2-Factor Authentication enabled. Do NOT use your regular Gmail password
// directly here.
const nodemailer = require("nodemailer");

// Create a Nodemailer transporter using SMTP (e.g., Gmail's SMTP)
const transporter = nodemailer.createTransport({
    service: "gmail", // You can also specify host, port, secure for other SMTP services
    auth: {
        // These credentials should be stored securely as Firebase Environment
        // Configuration variables. Set them using the Firebase CLI:
        // firebase functions:config:set email.user="your-sending-email@gmail.com"
        // email.password="your-gmail-app-password"
        user: functions.config().email.user,
        pass: functions.config().email.password,
    },
});

// --- Cloud Function Definition for Contact Email ---

// This Cloud Function is triggered whenever a new document is created
// in the 'contact_submissions' collection in Firestore. The {docId} is
// a wildcard that matches any document ID in that collection.
exports.sendContactEmail = functions.firestore
    .document("contact_submissions/{docId}")
    .onCreate(async (snap, context) => {
        // Get the data of the new document that triggered this function.
        const newSubmission = snap.data();

        // Extract relevant data from the submission
        const senderName = newSubmission.name;
        const senderEmail = newSubmission.email;
        const messageContent = newSubmission.message;
        // Convert Firestore Timestamp to a readable local string
        const submissionTime = newSubmission.timestamp ?
            newSubmission.timestamp.toDate().toLocaleString() :
            "N/A";

        // Configure the email to be sent
        const mailOptions = {
            from: "Your Website <your-sending-email@yourdomain.com>",
            to: "your-client-email@example.com",
            subject: `New Inquiry Received: ${senderName} (Wheelz AI)`,
            html: `
                <p>Hello,</p>
                <p>You have received a new contact form submission from your
                Wheelz AI website.</p>
                <br>
                <p><strong>Sender Name:</strong> ${senderName}</p>
                <p><strong>Sender Email:</strong> ${senderEmail}</p>
                <p><strong>Message:</strong></p>
                <div style="border: 1px solid #ccc; padding: 10px;
                margin-top: 10px; background-color: #f9f9f9;">
                    <p>${messageContent}</p>
                </div>
                <p><em>Submitted at: ${submissionTime}</em></p>
                <br>
                <p>Best regards,</p>
                <p>Wheelz AI Website Automated System</p>
            `,
        };

        try {
            // Attempt to send the email using the configured transporter
            await transporter.sendMail(mailOptions);
            console.log(
                "Email notification sent successfully for submission:",
                context.params.docId,
            );
            // Return null or a promise to indicate successful completion of the function
            return null;
        } catch (error) {
            // Log any errors that occur during email sending
            console.error(
                "Error sending email notification for submission:",
                context.params.docId,
                error,
            );
            // Return null to indicate the function completed its execution flow
            return null;
        }
    });

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({maxInstances: 5}, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({maxInstances: 10}) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
