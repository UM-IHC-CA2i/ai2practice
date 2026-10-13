/* AI2Practice accounts: Google, Microsoft (when turned on) or email/password sign-in through Firebase,
   with lesson progress synced to Firestore at users/{uid}.
   Loaded by progress.js only when assets/js/firebase-config.js has enabled:true.
   Local progress always stays in the browser; signing in merges it with the
   account (lessons are unioned, best scores kept) and keeps them in step. */
(function(){
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var cfg = window.AI2PRACTICE_FIREBASE || {};
  var st = { ready:false, user:null, syncing:false, error:'' };
  var auth, db, applying=false, timer=null, pending=false;

  function rail(){ return window.AI2PracticeProgressRail; }
  function emit(){ try { window.dispatchEvent(new CustomEvent('ai2practice:auth-changed')); } catch(e) {} }
  function load(src){
    return new Promise(function(res, rej){
      var s=document.createElement('script'); s.src=SDK+src; s.onload=res;
      s.onerror=function(){ rej(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  function doc(){ return db.collection('users').doc(st.user.uid); }

  function pull(){
    st.syncing=true; emit();
    return doc().get().then(function(snap){
      var data=snap.exists ? snap.data() : null;
      if (data && typeof data.progress==='string') {
        try { applying=true; rail().merge(JSON.parse(data.progress)); } catch(e) {} finally { applying=false; }
      }
      return push();
    }).catch(fail);
  }
  function push(){
    if (!st.user) return Promise.resolve();
    pending=false; clearTimeout(timer);
    st.syncing=true; emit();
    return doc().set({
      progress: JSON.stringify(rail().snapshot()),
      email: st.user.email || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true }).then(function(){ st.syncing=false; st.error=''; emit(); }).catch(fail);
  }
  function schedule(){
    if (applying || !st.user) return;
    pending=true; clearTimeout(timer); timer=setTimeout(push,1500);
  }
  function fail(e){
    st.syncing=false;
    st.error=(e && e.code==='permission-denied') ? 'Sync was refused. Progress is still saved in this browser.' : 'Could not sync right now. Progress is still saved in this browser.';
    emit();
  }
  function who(u){ return u ? { uid:u.uid, email:u.email, name:u.displayName || '' } : null; }

  var MESSAGES = {
    'auth/invalid-email':'That email address does not look right.',
    'auth/missing-email':'Enter your email address.',
    'auth/invalid-credential':'Email or password is incorrect.',
    'auth/wrong-password':'Email or password is incorrect.',
    'auth/user-not-found':'Email or password is incorrect.',
    'auth/invalid-login-credentials':'Email or password is incorrect.',
    'auth/email-already-in-use':'An account with this email already exists. Sign in instead, or use "Forgot password?".',
    'auth/weak-password':'Use a password of at least 6 characters.',
    'auth/too-many-requests':'Too many attempts. Wait a few minutes and try again.',
    'auth/popup-closed-by-user':'The sign-in window was closed before sign-in finished.',
    'auth/cancelled-popup-request':'The sign-in window was closed before sign-in finished.',
    'auth/network-request-failed':'No connection. Check your internet and try again.',
    'auth/unauthorized-domain':'Sign-in is not set up for this web address yet.',
    'auth/operation-not-allowed':'This sign-in method is not turned on yet.',
    'auth/account-exists-with-different-credential':'This email already uses a different sign-in method. Try the one you used first: Google, Microsoft, or email and password.'
  };

  // Popup first; fall back to a full-page redirect where popups are blocked.
  function popup(p){
    return auth.signInWithPopup(p).catch(function(e){
      if (e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')) return auth.signInWithRedirect(p);
      throw e;
    });
  }

  window.AI2PracticeAuth = {
    state:function(){ return st; },
    google:function(){ return popup(new firebase.auth.GoogleAuthProvider()); },
    microsoft:function(){
      var p=new firebase.auth.OAuthProvider('microsoft.com');
      p.setCustomParameters({ prompt:'select_account' });
      return popup(p);
    },
    signIn:function(email, pw){ return auth.signInWithEmailAndPassword(email, pw); },
    signUp:function(email, pw){ return auth.createUserWithEmailAndPassword(email, pw); },
    reset:function(email){
      return auth.sendPasswordResetEmail(email).catch(function(e){ if (e && e.code==='auth/user-not-found') return; throw e; });
    },
    signOut:function(){ if (pending) push(); return auth.signOut(); },
    // Removes the account's saved progress, then the account. Browser progress stays.
    deleteData:function(){
      var u=auth.currentUser; if (!u) return Promise.resolve('');
      clearTimeout(timer); pending=false;
      return doc().delete().then(function(){
        return u.delete().then(function(){ return ''; }, function(e){
          if (e && e.code==='auth/requires-recent-login') {
            return auth.signOut().then(function(){ return 'Your saved progress was deleted. To remove the account itself, sign in again and choose Delete once more.'; });
          }
          throw e;
        });
      });
    },
    message:function(e){ return (e && MESSAGES[e.code]) || 'Something went wrong. Please try again.'; }
  };

  load('firebase-app-compat.js')
    .then(function(){ return Promise.all([load('firebase-auth-compat.js'), load('firebase-firestore-compat.js')]); })
    .then(function(){
      firebase.initializeApp(cfg.config);
      auth=firebase.auth(); db=firebase.firestore();
      auth.getRedirectResult().catch(function(){});
      auth.onAuthStateChanged(function(u){
        st.user=who(u); st.ready=true; st.error='';
        emit();
        if (u) pull();
      });
      window.addEventListener('ai2practice:progress-changed', schedule);
      window.addEventListener('pagehide', function(){ if (pending) push(); });
    })
    .catch(function(){ st.error='Sign-in could not load. Progress is still saved in this browser.'; emit(); });
})();
