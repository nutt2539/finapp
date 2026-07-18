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

// Enable offline persistence to prevent data loss on immediate refresh
db.enablePersistence()
  .catch(function(err) {
      if (err.code == 'failed-precondition') {
          console.warn("Multiple tabs open, offline persistence disabled");
      } else if (err.code == 'unimplemented') {
          console.warn("Offline persistence not supported in this browser");
      }
  });

let currentUser = null;
let isAppLoaded = false;

window.isSavingToCloud = false;
window.syncDataToCloud = async function(specificKey = null, specificValue = null, showToast = false) {
    if (!currentUser) return false;
    window.isSavingToCloud = true;
    try {
        if (specificKey) {
            // Sync only specific key
            if (!specificKey.startsWith('firebase:')) {
                const savePromise = db.collection('users').doc(currentUser.uid).collection('data').doc(specificKey).set({
                    value: specificValue,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("FIREBASE_TIMEOUT")), 5000);
                });
                
                await Promise.race([savePromise, timeoutPromise]);
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
        
        // Update Autosave UI
        if (window.updateAutosaveUI) window.updateAutosaveUI('saved', showToast);
        
        window.isSavingToCloud = false;
        return true;
    } catch (e) {
        if (e.message === "FIREBASE_TIMEOUT") {
            alert("❌ สัญญาณอินเทอร์เน็ตมีปัญหา หรือ Firebase ไม่ตอบสนอง (Timeout)! ข้อมูลยังไม่ถูกเซฟลง Cloud กรุณาเช็คว่าสร้าง Database ใน Firebase หรือยังครับ");
        } else if (e.message && e.message.includes('Missing or insufficient permissions')) {
            alert("🚨 Firebase ถูกบล็อก! คุณต้องไปแก้ Security Rules ในแท็บ Rules ให้เป็น true ก่อน ข้อมูลถึงจะเซฟได้ครับ");
        } else {
            alert("⚠️ เกิดข้อผิดพลาดในการเซฟลง Cloud: " + e.message);
        }
        console.error("Error syncing to cloud: ", e);
        if (window.updateAutosaveUI) window.updateAutosaveUI('error', showToast);
        window.isSavingToCloud = false;
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
            let initialLoadDone = false;
            
            // Listen for real-time updates from Cloud
            db.collection('users').doc(user.uid).collection('data').onSnapshot((snapshot) => {
                if (snapshot.empty && !initialLoadDone) {
                    // No data in Firestore. Migrate from local storage if it exists.
                    let migrated = false;
                    window.isRestoringFromCloud = true;
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const val = localStorage.getItem(key);
                        if (val && !key.startsWith('firebase:')) {
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
                    let hasRemoteChanges = false;
                    try {
                        snapshot.docChanges().forEach(change => {
                            // Check if change came from server (not a local unacknowledged write)
                            if (!change.doc.metadata.hasPendingWrites) {
                                const val = change.doc.data().value;
                                if (val && localStorage.getItem(change.doc.id) !== val) {
                                    localStorage.setItem(change.doc.id, val);
                                    hasRemoteChanges = true;
                                }
                            }
                        });
                    } catch(err) {
                        console.error("Error in onSnapshot docChanges processing:", err);
                    } finally {
                        window.isRestoringFromCloud = false;
                    }
                    
                    if (hasRemoteChanges && initialLoadDone) {
                        console.log("Data updated from another device! Reloading...");
                        window.location.reload();
                    }
                }
                
                if (!initialLoadDone) {
                    initialLoadDone = true;
                    // Hide overlay, show app
                    document.getElementById('loginOverlay').style.display = 'none';
                    document.getElementById('mainAppContainer').style.display = 'flex';
                    
                    // Inject app.js if not already loaded
                    if (!isAppLoaded) {
                        const script = document.createElement('script');
                        script.src = 'app.js?v=' + Date.now();
                        script.onload = () => {
                            if (window.updateAutosaveUI) window.updateAutosaveUI('saved', false);
                        };
                        document.body.appendChild(script);
                        isAppLoaded = true;
                    } else {
                        window.location.reload();
                    }
                    
                    // Fallback Autosave every 1 minute
                    setInterval(() => {
                        if (window.syncDataToCloud) {
                            window.syncDataToCloud();
                        }
                    }, 60000);
                }
                
            }, (err) => {
                console.error("Snapshot error:", err);
                document.getElementById('loginStatus').innerText = "Error syncing data: " + err.message;
            });
            
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
