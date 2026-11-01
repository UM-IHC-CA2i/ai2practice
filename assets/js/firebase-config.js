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
    apiKey: 'AIzaSyBl9byyiHW6FR7UmD2auFXbFcX1_LJcZ7c',
    authDomain: 'ai2practice-22fca.firebaseapp.com',
    projectId: 'ai2practice-22fca',
    storageBucket: 'ai2practice-22fca.firebasestorage.app',
    messagingSenderId: '474570609712',
    appId: '1:474570609712:web:6260aafa756be0d05909f5'
  }
};
