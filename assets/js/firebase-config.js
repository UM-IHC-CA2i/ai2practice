/* AI2Practice sign-in settings.
   Sign-in stays off (progress saves in the browser only) until enabled is true
   and the config below is filled in from the Firebase console:
   Project settings > General > Your apps > SDK setup and configuration > Config.
   These values identify the project; they are not secret. Access is controlled
   by the Firestore security rules.
   microsoft: shows "Continue with Microsoft" once the Microsoft provider is
   turned on in Firebase (Authentication > Sign-in method). */
window.AI2PRACTICE_FIREBASE = {
  enabled: true,
  microsoft: false,
  config: {
    apiKey: 'AIzaSyC-iWK-Np5pHg1ZxoNuvBMD_F1BRRZmyWc',
    authDomain: 'ai2practice-cecbc.firebaseapp.com',
    projectId: 'ai2practice-cecbc',
    storageBucket: 'ai2practice-cecbc.firebasestorage.app',
    messagingSenderId: '55220824447',
    appId: '1:55220824447:web:b875442621b8773edfd24a'
  }
};
