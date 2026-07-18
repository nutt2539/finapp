const firebaseConfig = {
  apiKey: "AIzaSyCF0OTECarnjLad7RDXO9lSmrV5enGmyCU",
  authDomain: "finapp-ab320.firebaseapp.com",
  projectId: "finapp-ab320",
  storageBucket: "finapp-ab320.firebasestorage.app",
  messagingSenderId: "108857045272",
  appId: "1:108857045272:web:58bc43d42013cf7432ae6d",
  measurementId: "G-PL251R15EN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let isAppLoaded = false;

// Explicit sync function (Sync specific key, or all if none provided)
window.syncDataToCloud = async function(specificKey = null, specificValue = null) {
    if (!currentUser) return false;
    try {
        if (specificKey) {
            // Sync only specific key
            if (!specificKey.startsWith('firebase:')) {
                await db.collection('users').doc(currentUser.uid).collection('data').doc(specificKey).set({
                    value: specificValue,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            // Sync all local storage
            const promises = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (val && !key.startsWith('firebase:')) {
                    promises.push(db.collection('users').doc(currentUser.uid).collection('data').doc(key).set({
                        value: val,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }));
                }
            }
            await Promise.all(promises);
        }
        return true;
    } catch(err) {
        console.error("Firebase sync error:", err);
        return false;
    }
};

// Login Button Event
document.getElementById('btnGoogleSignIn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        document.getElementById('loginStatus').innerText = "Login failed: " + err.message;
    });
});

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Restrict access to a specific email
        const allowedEmails = ["tu13u1e@gmail.com"];
        if (!allowedEmails.includes(user.email)) {
            auth.signOut();
            document.getElementById('loginStatus').innerText = "Access Denied: This email is not authorized.";
            alert("คุณไม่ได้รับอนุญาตให้ใช้งานแอปพลิเคชันนี้ (Access Denied)");
            return;
        }

        currentUser = user;
        document.getElementById('loginStatus').innerText = "Loading your data securely...";
        
        try {
            // Fetch all docs for this user
            const snapshot = await db.collection('users').doc(user.uid).collection('data').get();
            
            if (snapshot.empty) {
                // No data in Firestore. Migrate from local storage if it exists.
                let migrated = false;
                window.isRestoringFromCloud = true;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const val = localStorage.getItem(key);
                    if (val && !key.startsWith('firebase:')) {
                        // We silence the individual overrides to avoid hammering Firestore
                        localStorage.setItem(key, val); 
                        migrated = true;
                    }
                }
                window.isRestoringFromCloud = false;
                
                if (migrated) {
                    console.log("Migrated local data to Firestore!");
                    if (window.syncDataToCloud) window.syncDataToCloud(); // bulk upload
                }
            } else {
                // Restore from Firestore to localStorage silently
                window.isRestoringFromCloud = true;
                snapshot.forEach(doc => {
                    if (doc.data().value) {
                        localStorage.setItem(doc.id, doc.data().value);
                    }
                });
                window.isRestoringFromCloud = false;
                console.log("Data loaded from Firestore");
            }
            
            // Hide overlay, show app
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainAppContainer').style.display = 'flex';
            
            // Inject app.js if not already loaded
            if (!isAppLoaded) {
                const script = document.createElement('script');
                script.src = 'app.js?v=2';
                document.body.appendChild(script);
                isAppLoaded = true;
            } else {
                // If app is already loaded (e.g. re-login without refresh), reload page
                window.location.reload();
            }
            
        } catch(err) {
            document.getElementById('loginStatus').innerText = "Error loading data: " + err.message;
            console.error(err);
            alert("Firebase Load Error: " + err.message);
        }
    } else {
        currentUser = null;
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('mainAppContainer').style.display = 'none';
        document.getElementById('loginStatus').innerText = "";
    }
});
