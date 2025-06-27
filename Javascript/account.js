import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, updateProfile, updateEmail, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Added deleteDoc

        // Global variables for Firebase config and app ID
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        let userId = null; // Will store the user's UID or a random ID if anonymous
        let isAuthReady = false; // Flag to indicate when authentication is ready

        // Function to show a generic message modal
        function showMessage(title, message) {
            document.getElementById('messageModalTitle').innerText = title;
            document.getElementById('messageModalContent').innerText = message;
            document.getElementById('messageModal').style.display = 'flex';
        }

        // Function to hide the generic message modal
        function hideMessage() {
            document.getElementById('messageModal').style.display = 'none';
        }


        // Authenticate user when the script loads
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("Authenticated with user ID:", userId);
                await fetchAccountDetails(user); // Fetch details for the authenticated user
            } else {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                        // onAuthStateChanged will be triggered again with the custom token user
                    } else {
                        await signInAnonymously(auth);
                        // onAuthStateChanged will be triggered again with the anonymous user
                    }
                } catch (error) {
                    console.error("Error signing in:", error);
                    showMessage('Authentication Error', `Failed to sign in: ${error.message}. Attempting anonymous sign-in.`);
                    // Fallback to anonymous sign-in is handled by the onAuthStateChanged re-trigger
                    document.getElementById('accountName').innerText = 'Error loading';
                    document.getElementById('accountEmail').innerText = 'Error loading';
                }
            }
            isAuthReady = true; // Mark authentication as ready
        });

        // Function to fetch and display account details
        async function fetchAccountDetails(user) {
            const accountNameElem = document.getElementById('accountName');
            const accountEmailElem = document.getElementById('accountEmail');
            const contactNumberElem = document.getElementById('contactNumber');

            // Display Firebase Auth details
            accountNameElem.innerText = user.displayName || 'Not Set';
            accountEmailElem.innerText = user.email || 'Not Set';

            // Fetch additional details from Firestore (e.g., contact number)
            if (userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/accountDetails`, 'profile');
                onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        contactNumberElem.innerText = data.contactNumber || 'Not Set';
                    } else {
                        console.log("No additional profile data found in Firestore, using defaults.");
                        contactNumberElem.innerText = 'Not Set';
                    }
                }, (error) => {
                    console.error("Error fetching Firestore data:", error);
                    showMessage('Data Fetch Error', `Failed to load contact number: ${error.message}`);
                    contactNumberElem.innerText = 'Error loading';
                });
            } else {
                contactNumberElem.innerText = 'Not available (anonymous user)';
            }
        }


        // Modified editField function to update Firebase Auth and Firestore
        async function editField(fieldId, fieldName) {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.error("No user logged in to edit details.");
                showMessage('Error', 'No user logged in to edit details.');
                return;
            }

            const currentValueElem = document.getElementById(fieldId);
            const currentValue = currentValueElem.innerText;
            const newValue = prompt(`Edit ${fieldName}:`, currentValue); // Using prompt for simple input

            if (newValue !== null && newValue.trim() !== '') {
                try {
                    if (fieldId === 'accountName') {
                        await updateProfile(currentUser, { displayName: newValue.trim() });
                        currentValueElem.innerText = newValue.trim();
                        showMessage('Success', `${fieldName} updated successfully!`);
                        console.log(`Account Name updated to: ${newValue.trim()}`);
                    } else if (fieldId === 'accountEmail') {
                        await updateEmail(currentUser, newValue.trim());
                        currentValueElem.innerText = newValue.trim();
                        showMessage('Success', `${fieldName} updated successfully!`);
                        console.log(`Account Email updated to: ${newValue.trim()}`);
                    } else if (fieldId === 'contactNumber') {
                        // Update Firestore for contact number
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/accountDetails`, 'profile');
                        await setDoc(docRef, { contactNumber: newValue.trim() }, { merge: true });
                        currentValueElem.innerText = newValue.trim();
                        showMessage('Success', `${fieldName} updated successfully!`);
                        console.log(`Contact Number updated to: ${newValue.trim()}`);
                    }
                } catch (error) {
                    console.error(`Error updating ${fieldName}:`, error);
                    showMessage('Update Failed', `Failed to update ${fieldName}: ${error.message}`);
                }
            }
        }

        async function showDeleteConfirmation() {
            document.getElementById('deleteModal').style.display = 'flex';
        }

        async function hideDeleteConfirmation() {
            document.getElementById('deleteModal').style.display = 'none';
        }

        async function deleteAccount() {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.error("No user logged in to delete account.");
                hideDeleteConfirmation();
                showMessage('Error', 'No user logged in to delete account.');
                return;
            }

            try {
                // Delete user from Firebase Authentication
                await deleteUser(currentUser);

                // Optionally, delete user's data from Firestore (private data)
                // This is a simplified example; for robust deletion, you'd usually use a Cloud Function
                if (userId) {
                    const docRef = doc(db, `artifacts/${appId}/users/${userId}/accountDetails`, 'profile');
                    await deleteDoc(docRef); // This now explicitly requires 'deleteDoc' import
                    console.log("Firestore profile data deleted.");
                }

                showMessage('Account Deleted', 'Your account has been successfully deleted. You will be redirected.');
                hideDeleteConfirmation();
                // Redirect after a short delay to allow message to be seen
                setTimeout(() => {
                    window.location.href = 'dashboard.html'; // Redirect to dashboard or login page
                }, 2000);

            } catch (error) {
                console.error("Error deleting account:", error);
                showMessage('Deletion Failed', `Failed to delete account: ${error.message}`);
                hideDeleteConfirmation();
            }
        }