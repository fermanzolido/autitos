// set-admin-claim.js
const admin = require('firebase-admin');

// Carga la clave de cuenta de servicio que descargaste.
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa la app de Admin con tus credenciales.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// -------- ¡IMPORTANTE! --------
// Reemplaza este UID con el UID del usuario que copiaste en el Paso 1.
const uid = 'g4Qh0tnQ0FZ2qbLUW7cvDK7fxS63';
// ---------------------------

// Este es el rol que vamos a asignar.
const customClaims = {
  role: 'admin'
};

// Asigna el rol al usuario.
admin.auth().setCustomUserClaims(uid, customClaims)
  .then(() => {
    console.log(`\n¡Éxito! Se ha asignado el rol de 'admin' al usuario ${uid}`);
    console.log("El usuario ahora podrá iniciar sesión con permisos de administrador.");
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error al establecer los permisos:', error);
    process.exit(1);
  });