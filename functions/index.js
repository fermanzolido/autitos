const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const db = admin.firestore();

exports.handleConfirmOrder = functions.https.onCall(async (data, context) => {
  const vehicleId = data.vehicleId;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const vehicleRef = db.collection("vehicles").doc(vehicleId);

  try {
    await db.runTransaction(async (transaction) => {
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Vehicle not found.");
      }

      const vehicleData = vehicleDoc.data();

      if (vehicleData.status !== "asignado") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Vehicle status must be "asignado" to confirm an order, but it is "${vehicleData.status}".`
        );
      }

      transaction.update(vehicleRef, {
        status: "enTransito",
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: "enTransito",
          date: new Date(),
        }),
      });
    });

    return { success: true, message: "Order confirmed successfully." };
  } catch (error) {
    console.error("Error confirming order:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An internal error occurred while confirming the order."
    );
  }
});

exports.receiveVehicle = functions.https.onCall(async (data, context) => {
  const vehicleId = data.vehicleId;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const vehicleRef = db.collection("vehicles").doc(vehicleId);

  try {
    await db.runTransaction(async (transaction) => {
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Vehicle not found.");
      }

      const vehicleData = vehicleDoc.data();

      if (vehicleData.status !== "enTransito") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Vehicle status must be "enTransito" to be received, but it is "${vehicleData.status}".`
        );
      }

      transaction.update(vehicleRef, {
        status: "enConcesionario",
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: "enConcesionario",
          date: new Date(),
        }),
      });
    });

    return { success: true, message: "Vehicle received successfully." };
  } catch (error) {
    console.error("Error receiving vehicle:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An internal error occurred while receiving the vehicle."
    );
  }
});
