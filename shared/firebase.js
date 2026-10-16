window.CSM = (function() {
  const firebaseConfig = {
  apiKey: "AIzaSyCQHH4QgqgYNu3tnGDP55Pne0neQskUvqE",
  authDomain: "contractsocialmanager-v1.firebaseapp.com",
  projectId: "contractsocialmanager-v1",
  storageBucket: "contractsocialmanager-v1.firebasestorage.app",
  messagingSenderId: "990515772482",
  appId: "1:990515772482:web:8384d6427f315e2bddc1db"
};

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();

  db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn("Persistence error:", err.code);
  });

  window.db = db;
  window.auth = auth;

  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('r') || localStorage.getItem('csct_restaurant_id') || 'ketia';
  localStorage.setItem('csct_restaurant_id', restaurantId);

  let authResolve;
  const authReady = new Promise(res => { authResolve = res; });
  let readyResolve;
  const ready = new Promise(res => { readyResolve = res; });

  auth.onAuthStateChanged(user => {
    authResolve(user);
    if (user) {
      db.collection('managerRestaurants').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().restaurantId === restaurantId) {
          readyResolve(true);
        } else {
          readyResolve(false);
        }
      }).catch(() => readyResolve(false));
    }
  });

  return {
    authReady,
    ready,
    restaurantId,
    restaurantName: restaurantId.toUpperCase(),
    refs: {
      restaurant: () => db.collection('restaurants').doc(restaurantId),
      staffColl: () => db.collection('restaurants').doc(restaurantId).collection('staff'),
      staff: (badge) => db.collection('restaurants').doc(restaurantId).collection('staff').doc(badge),
      shifts: () => db.collection('restaurants').doc(restaurantId).collection('shifts'),
      shift: (id) => db.collection('restaurants').doc(restaurantId).collection('shifts').doc(id),
      schedules: () => db.collection('restaurants').doc(restaurantId).collection('schedules'),
      leaveReqs: () => db.collection('restaurants').doc(restaurantId).collection('leaveRequests'),
      corrections: () => db.collection('restaurants').doc(restaurantId).collection('corrections'),
      auditLog: () => db.collection('restaurants').doc(restaurantId).collection('auditLog'),
      managers: (uid) => db.collection('managerRestaurants').doc(uid)
    }
  };
})();
