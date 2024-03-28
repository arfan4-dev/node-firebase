const firebase = require("firebase");
const { doc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: "AIzaSyAWbAytUVb29uS9k7rQUqaOOjiHou33YIQ",
  authDomain: "crud-nodejs-cb11c.firebaseapp.com",
  projectId: "crud-nodejs-cb11c",
  storageBucket: "crud-nodejs-cb11c.appspot.com",
  messagingSenderId: "108643777286",
  appId: "1:108643777286:web:34e2c3e44f755983bd3c87"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const User = db.collection("User");

module.exports = { User, db, doc };
