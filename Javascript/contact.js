// Import Firebase SDK functions using their full CDN URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAOamMqCPIzJurf85fjBleVmWffdscEslM",
    authDomain: "wheelzai.firebaseapp.com",
    projectId: "wheelzai",
    storageBucket: "wheelzai.firebasestorage.app",
    messagingSenderId: "132756052907",
    appId: "1:132756052907:web:b92dc998b4b5bee8d450ee",
    measurementId: "G-ECQJYZYK43"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage'); // Get the message display div

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the default form submission

            // Get form input values using their IDs
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            // Clear previous messages
            formMessage.textContent = '';
            formMessage.style.color = '';

            // Basic client-side validation
            if (!name || !email || !message) {
                formMessage.textContent = 'Please fill in all fields.';
                formMessage.style.color = 'red';
                return; // Stop the function if validation fails
            }

            // Optional: Basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formMessage.textContent = 'Please enter a valid email address.';
                formMessage.style.color = 'red';
                return;
            }

            // Disable the submit button to prevent multiple submissions
            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...'; // Provide feedback to the user
            }

            try {
                // Add a new document to the 'contact_submissions' collection in Firestore
                const docRef = await addDoc(collection(db, "contact_submissions"), {
                    name: name,
                    email: email,
                    message: message,
                    timestamp: new Date() // Add a server-side timestamp for when the submission occurred
                });

                console.log("Document written with ID: ", docRef.id);
                formMessage.textContent = 'Your message has been sent successfully!';
                formMessage.style.color = 'green';
                contactForm.reset(); // Clear the form fields after successful submission

            } catch (e) {
                console.error("Error adding document: ", e);
                formMessage.textContent = 'There was an error sending your message. Please try again.';
                formMessage.style.color = 'red';
            } finally {
                // Re-enable the submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                }
            }
        });
    }
});
