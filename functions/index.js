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

      if (!vehicleData.dealerId) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Vehicle is not assigned to a dealer."
        );
      }

      const dealerRef = db.collection("dealers").doc(vehicleData.dealerId);
      const dealerDoc = await transaction.get(dealerRef);

      if (!dealerDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Dealer not found.");
      }

      const dealerData = dealerDoc.data();
      const availableCredit = dealerData.availableCredit || 0;
      const vehiclePrice = vehicleData.price || 0;

      if (availableCredit < vehiclePrice) {
          throw new functions.https.HttpsError(
              "failed-precondition",
              `Insufficient credit. Available: ${availableCredit}, Required: ${vehiclePrice}`
          );
      }

      const newAvailableCredit = availableCredit - vehiclePrice;

      transaction.update(dealerRef, { availableCredit: newAvailableCredit });

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

exports.markInvoiceAsPaid = functions.https.onCall(async (data, context) => {
    const invoiceId = data.invoiceId;

    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const invoiceRef = db.collection("b2b_invoices").doc(invoiceId);

    try {
        await db.runTransaction(async (transaction) => {
            const invoiceDoc = await transaction.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Invoice not found.");
            }

            const invoiceData = invoiceDoc.data();

            if (invoiceData.status !== "pendiente") {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    `Invoice status must be "pendiente" to be marked as paid, but it is "${invoiceData.status}".`
                );
            }

            const dealerRef = db.collection("dealers").doc(invoiceData.dealerId);
            const dealerDoc = await transaction.get(dealerRef);

            if (!dealerDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Dealer not found.");
            }

            const dealerData = dealerDoc.data();
            const invoiceAmount = invoiceData.price || 0;
            const currentAvailableCredit = dealerData.availableCredit || 0;
            const newAvailableCredit = currentAvailableCredit + invoiceAmount;

            transaction.update(dealerRef, { availableCredit: newAvailableCredit });
            transaction.update(invoiceRef, { status: "pagada" });
        });

        return { success: true, message: "Invoice marked as paid successfully." };
    } catch (error) {
        console.error("Error marking invoice as paid:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError(
            "internal",
            "An internal error occurred while marking the invoice as paid."
        );
    }
});

exports.matchFactoryOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth || (context.auth.token.role !== 'admin' && context.auth.token.role !== 'factory')) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "The function must be called by an admin or factory user."
        );
    }

    const { factoryOrderId, vehicleId } = data;

    const factoryOrderRef = db.collection("factory_orders").doc(factoryOrderId);
    const vehicleRef = db.collection("vehicles").doc(vehicleId);

    try {
        await db.runTransaction(async (transaction) => {
            const factoryOrderDoc = await transaction.get(factoryOrderRef);
            const vehicleDoc = await transaction.get(vehicleRef);

            if (!factoryOrderDoc.exists || !vehicleDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Factory order or vehicle not found.");
            }

            const factoryOrderData = factoryOrderDoc.data();
            const vehicleData = vehicleDoc.data();

            if (factoryOrderData.status !== 'pendiente') {
                throw new functions.https.HttpsError("failed-precondition", "Factory order is not pending.");
            }

            if (vehicleData.dealerId || vehicleData.status !== 'enFabrica') {
                throw new functions.https.HttpsError("failed-precondition", "Vehicle is not available for matching.");
            }

            transaction.update(factoryOrderRef, {
                status: 'emparejado',
                matchedVehicleId: vehicleId
            });

            transaction.update(vehicleRef, {
                dealerId: factoryOrderData.dealerId,
                status: 'asignado',
                statusHistory: admin.firestore.FieldValue.arrayUnion({
                    status: "asignado",
                    date: new Date(),
                }),
            });
        });

        return { success: true, message: "Factory order matched successfully." };
    } catch (error) {
        console.error("Error matching factory order:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError(
            "internal",
            "An internal error occurred while matching the factory order."
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
