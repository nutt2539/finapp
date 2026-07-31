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
window.sharedCalendarEvents = [];

window.syncSharedCalendar = async function(eventsArray) {
    if (!currentUser) return false;
    try {
        await db.collection('shared').doc('life_schedule').set({
            events: eventsArray,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Shared calendar sync error:", e);
        return false;
    }
};

window.isSavingToCloud = false;
window.syncDataToCloud = async function(specificKey = null, specificValue = null, showToast = false) {
    if (!currentUser) return false;
    window.isSavingToCloud = true;
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FIREBASE_TIMEOUT')), 5000));
        
        if (specificKey) {
            // Sync only specific key
            if (!specificKey.startsWith('firebase:')) {
                const savePromise = db.collection('users').doc(currentUser.uid).collection('data').doc(specificKey).set({
                    value: specificValue,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
            await Promise.race([Promise.all(promises), timeoutPromise]);
        }
        
        // Update Autosave UI
        if (window.updateAutosaveUI) window.updateAutosaveUI('saved', showToast);
        
        return true;
    } catch (e) {
        if (e.message === 'FIREBASE_TIMEOUT') {
            if (showToast) alert('❌ การบันทึกข้อมูลล่าช้า: สัญญาณอินเทอร์เน็ตหรือเซิร์ฟเวอร์อาจมีปัญหา ข้อมูลยังถูกบันทึกในเครื่องและจะส่งซ้ำเมื่อพร้อม');
            if (window.updateAutosaveUI) window.updateAutosaveUI('error', showToast);
        } else {
            console.error("Firebase sync error:", e);
            if (window.updateAutosaveUI) window.updateAutosaveUI('error', showToast);
        }
        return false;
    } finally {
        window.isSavingToCloud = false;
    }
};

window.downloadDataFromCloud = async function() {
    if (!currentUser) return;
    
    let snapshot;
    try {
        snapshot = await db.collection('users').doc(currentUser.uid).collection('data').get();
    } catch(err) {
        console.error("Firebase fetch error:", err);
        return;
    }
    
    if (!snapshot.empty) {
        window.isRestoringFromCloud = true;
        try {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data && data.value !== undefined) {
                    localStorage.setItem(doc.id, data.value);
                }
            });
            console.log("Data restored from cloud.");
            // Refresh UI to show new data
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderCategoryManageList === 'function') {
                renderCategoryManageList();
                renderCategoryDropdowns();
            }
            if (typeof renderFixedManageLists === 'function') renderFixedManageLists();
        } finally {
            window.isRestoringFromCloud = false;
        }
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
        // Restrict access to authorized users only (Security Measure)
        const allowedEmails = ["tu13u1e@gmail.com", "patchareebestpatcha@gmail.com"];
        if (!allowedEmails.includes(user.email)) {
            auth.signOut();
            document.getElementById('loginStatus').innerText = "Access Denied: Unauthorized email.";
            alert("⚠️ เข้าสู่ระบบไม่ได้: ระบบถูกล็อคให้ใช้งานได้เฉพาะคุณนัทและคุณเบสเท่านั้นครับ (Security Mode)");
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
                                if (val !== null && val !== undefined) {
                                    if (localStorage.getItem(change.doc.id) !== val) {
                                        localStorage.setItem(change.doc.id, val);
                                        hasRemoteChanges = true;
                                    }
                                } else {
                                    if (localStorage.getItem(change.doc.id) !== null) {
                                        localStorage.removeItem(change.doc.id);
                                        hasRemoteChanges = true;
                                    }
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
                    
                    // Removed fallback autosave to save quota. Users must save manually where applicable.
                }
                
        }, (err) => {
                console.error("Snapshot error:", err);
                document.getElementById('loginStatus').innerText = "Error syncing data: " + err.message;
            });

            // Listen for Shared Calendar updates
            window.syncSharedCalendar = function(myEvents) {
    if (!currentUser) return;
    
    // Only upload events that belong to the current user
    const myEventsFiltered = myEvents.filter(e => e.owner === currentUser.email || !e.owner || e.owner === 'local').map(e => ({
        ...e,
        owner: currentUser.email
    }));
    
    // Get current shared events
    db.collection('shared').doc('life_schedule').get().then(doc => {
        let allEvents = [];
        if (doc.exists) {
            allEvents = doc.data().events || [];
        }
        
        // Remove all my old events
        allEvents = allEvents.filter(e => e.owner !== currentUser.email);
        
        // Add my new events
        allEvents = [...allEvents, ...myEventsFiltered];
        
        // Save back
        db.collection('shared').doc('life_schedule').set({
            events: allEvents,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Shared calendar synced successfully!");
        }).catch(err => {
            console.error("Error writing to shared calendar:", err);
            window.showToast('Error syncing shared calendar: ' + err.message, 'error');
        });
    }).catch(err => {
        console.error("Error reading shared calendar:", err);
        window.showToast('Error reading shared calendar: ' + err.message, 'error');
    });
};

            db.collection('shared').doc('life_schedule').onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data && data.events) {
                        window.sharedCalendarEvents = data.events;
                        // Tell app.js to re-render calendar if it's loaded
                        if (window.renderCalendar && document.getElementById('view-schedule').classList.contains('active')) {
                            window.renderCalendar();
                        }
                    }
                }
            }, (err) => {
                console.error("Shared calendar snapshot error:", err);
                if (window.showToast) {
                    window.showToast("Firestore Error: " + err.message, "error");
                } else {
                    alert("Firestore Error: " + err.message);
                }
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

// Logout function for Multi-User Support
window.logoutUser = async function() {
    if (confirm("ออกจากระบบใช่ไหมครับ? (ข้อมูลในเครื่องจะถูกล้างชั่วคราว เพื่อความปลอดภัยเวลาคนอื่นมาล็อกอินต่อ ข้อมูลของคุณยังอยู่ในคลาวด์ปลอดภัยครับ)")) {
        try {
            // Save API key pool so they don't have to re-enter it
            const apiKeyPool = localStorage.getItem('gemini_api_key_pool');
            
            // Sign out from Firebase
            await auth.signOut();
            
            // Clear local storage to prevent data bleeding to the next user
            localStorage.clear();
            
            // Restore API key pool
            if (apiKeyPool) localStorage.setItem('gemini_api_key_pool', apiKeyPool);
            
            // Reload page to start fresh and show login screen
            window.location.reload();
        } catch (err) {
            console.error("Logout error:", err);
            alert("Error logging out: " + err.message);
        }
    }
};
