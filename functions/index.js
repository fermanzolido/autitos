const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const db = admin.firestore();

// Helper functions for role checks
const hasRole = (auth, role) => {
    return auth && auth.token && auth.token.role === role;
};

const isOneOfRoles = (auth, roles) => {
    return auth && auth.token && roles.includes(auth.token.role);
};

exports.handleConfirmOrder = functions.https.onCall(async (data, context) => {
  const vehicleId = data.vehicleId;

  if (!hasRole(context.auth, 'dealer')) {
    throw new functions.https.HttpsError('permission-denied', 'Must be a dealer user.');
  }
  const dealerId = context.auth.token.dealerId;
  if (!dealerId) {
      throw new functions.https.HttpsError('permission-denied', 'Dealer user must have a dealerId claim.');
  }

  const vehicleRef = db.collection("vehicles").doc(vehicleId);

  try {
    await db.runTransaction(async (transaction) => {
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Vehicle not found.");
      }

      const vehicleData = vehicleDoc.data();

      if (vehicleData.dealerId !== dealerId) {
        throw new functions.https.HttpsError('permission-denied', 'Vehicle is not assigned to this dealer.');
      }

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
    if (!isOneOfRoles(context.auth, ['admin', 'factory'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or factory user.');
    }
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
    if (!isOneOfRoles(context.auth, ['admin', 'factory'])) {
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

  if (!hasRole(context.auth, 'dealer')) {
    throw new functions.https.HttpsError('permission-denied', 'Must be a dealer user.');
  }
  const dealerId = context.auth.token.dealerId;
  if (!dealerId) {
      throw new functions.https.HttpsError('permission-denied', 'Dealer user must have a dealerId claim.');
  }

  const vehicleRef = db.collection("vehicles").doc(vehicleId);

  try {
    await db.runTransaction(async (transaction) => {
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Vehicle not found.");
      }

      const vehicleData = vehicleDoc.data();

      if (vehicleData.dealerId !== dealerId) {
        throw new functions.https.HttpsError('permission-denied', 'Vehicle is not assigned to this dealer.');
      }

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

exports.saveVehicle = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'factory'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or factory user.');
    }

    const { vehicleId, vehicleData } = data;

    if (!vehicleData || !vehicleData.vin || !vehicleData.make || !vehicleData.model) {
        throw new functions.https.HttpsError('invalid-argument', 'VIN, make, and model are required.');
    }

    if (vehicleData.fabrication_date) {
        vehicleData.fabrication_date = admin.firestore.Timestamp.fromDate(new Date(vehicleData.fabrication_date));
    }

    if (vehicleId) {
        const vehicleRef = db.collection('vehicles').doc(vehicleId);
        const vehicleDoc = await vehicleRef.get();
        if (!vehicleDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Vehicle not found.');
        }
        const oldVehicleData = vehicleDoc.data();

        const updatedData = { ...vehicleData };
        if (vehicleData.status !== oldVehicleData.status) {
            updatedData.statusHistory = admin.firestore.FieldValue.arrayUnion({
                status: vehicleData.status,
                date: new Date()
            });
        }

        if (vehicleData.status === 'enConcesionario' && oldVehicleData.status !== 'enConcesionario' && oldVehicleData.dealerId) {
            const invoiceData = {
                vehicleId: vehicleId,
                dealerId: oldVehicleData.dealerId,
                price: oldVehicleData.price,
                date: new Date(),
                status: 'pendiente',
                documentURL: '',
            };
            await db.collection('b2b_invoices').add(invoiceData);
        }

        await vehicleRef.update(updatedData);
        return { success: true, message: 'Vehicle updated successfully.' };
    } else {
        const vinExistsQuery = await db.collection('vehicles').where('vin', '==', vehicleData.vin).get();
        if (!vinExistsQuery.empty) {
            throw new functions.https.HttpsError('already-exists', 'A vehicle with this VIN already exists.');
        }

        const newVehicleData = {
            ...vehicleData,
            statusHistory: [{ status: vehicleData.status || 'enFabrica', date: new Date() }]
        };
        const newVehicleRef = await db.collection('vehicles').add(newVehicleData);
        return { success: true, message: 'Vehicle created successfully.', vehicleId: newVehicleRef.id };
    }
});

exports.deleteVehicle = functions.https.onCall(async (data, context) => {
    if (!hasRole(context.auth, 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin user.');
    }
    const { vehicleId } = data;
    if (!vehicleId) {
        throw new functions.https.HttpsError('invalid-argument', 'vehicleId is required.');
    }
    await db.collection('vehicles').doc(vehicleId).delete();
    return { success: true, message: 'Vehicle deleted successfully.' };
});

exports.assignDealer = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'factory'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or factory user.');
    }
    const { vehicleId, dealerId } = data;
    if (!vehicleId || !dealerId) {
        throw new functions.https.HttpsError('invalid-argument', 'vehicleId and dealerId are required.');
    }
    await db.collection('vehicles').doc(vehicleId).update({ dealerId: dealerId });
    return { success: true, message: 'Dealer assigned successfully.' };
});

exports.saveDealer = functions.https.onCall(async (data, context) => {
    if (!hasRole(context.auth, 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin user.');
    }
    const { dealerId, dealerData } = data;
    if (!dealerData || !dealerData.name) {
        throw new functions.https.HttpsError('invalid-argument', 'Dealer name is required.');
    }

    dealerData.creditLine = Number(dealerData.creditLine) || 0;

    if (dealerId) {
        const dealerRef = db.collection('dealers').doc(dealerId);
        const dealerDoc = await dealerRef.get();
        if (!dealerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Dealer not found.');
        }
        const oldDealerData = dealerDoc.data();
        const creditLineDiff = dealerData.creditLine - (oldDealerData.creditLine || 0);
        const newAvailableCredit = (oldDealerData.availableCredit || 0) + creditLineDiff;

        await dealerRef.update({
            ...dealerData,
            availableCredit: newAvailableCredit
        });
        return { success: true, message: 'Dealer updated successfully.' };

    } else {
        dealerData.availableCredit = dealerData.creditLine;
        const newDealerRef = await db.collection('dealers').add(dealerData);
        return { success: true, message: 'Dealer created successfully.', dealerId: newDealerRef.id };
    }
});

exports.deleteDealer = functions.https.onCall(async (data, context) => {
    if (!hasRole(context.auth, 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin user.');
    }
    const { dealerId } = data;
    if (!dealerId) {
        throw new functions.https.HttpsError('invalid-argument', 'dealerId is required.');
    }
    await db.collection('dealers').doc(dealerId).delete();
    return { success: true, message: 'Dealer deleted successfully.' };
});

exports.saveCustomer = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'dealer'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or dealer user.');
    }

    const { customerId, customerData } = data;
    if (!customerData || !customerData.name || !customerData.dni) {
        throw new functions.https.HttpsError('invalid-argument', 'Customer name and DNI are required.');
    }

    if (customerData.birth_date) {
        customerData.birth_date = admin.firestore.Timestamp.fromDate(new Date(customerData.birth_date));
    }

    if (customerId) {
        await db.collection('customers').doc(customerId).update(customerData);
        return { success: true, message: 'Customer updated successfully.' };
    } else {
        const newCustomerRef = await db.collection('customers').add(customerData);
        return { success: true, message: 'Customer created successfully.', customerId: newCustomerRef.id };
    }
});

exports.deleteCustomer = functions.https.onCall(async (data, context) => {
    if (!hasRole(context.auth, 'admin')) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin user.');
    }
    const { customerId } = data;
    if (!customerId) {
        throw new functions.https.HttpsError('invalid-argument', 'customerId is required.');
    }
    await db.collection('customers').doc(customerId).delete();
    return { success: true, message: 'Customer deleted successfully.' };
});

exports.saveInteraction = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'dealer'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or dealer user.');
    }
    const { customerId, interactionData } = data;
    if (!customerId || !interactionData || !interactionData.notes) {
        throw new functions.https.HttpsError('invalid-argument', 'customerId and notes are required.');
    }

    const dataToSave = {
        ...interactionData,
        customerId: customerId,
        date: new Date(),
        followUpStatus: 'completed',
    };

    if (interactionData.followUpDate) {
        dataToSave.followUpDate = admin.firestore.Timestamp.fromDate(new Date(interactionData.followUpDate));
        dataToSave.followUpStatus = 'pending';
    }

    await db.collection('interactions').add(dataToSave);
    return { success: true, message: 'Interaction saved successfully.' };
});

exports.registerSale = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'dealer'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or dealer user.');
    }

    const { salePayload } = data;
    let dealerId = context.auth.token.dealerId;
    if (hasRole(context.auth, 'admin') && salePayload.dealerId) {
        dealerId = salePayload.dealerId;
    }


    if (hasRole(context.auth, 'dealer') && !dealerId) {
        throw new functions.https.HttpsError('permission-denied', 'Dealer user must have a dealerId claim.');
    }

    if (!salePayload.vehicleId || (!salePayload.customerId && !salePayload.newCustomerData) || !salePayload.finalPrice) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required sale data.');
    }

    const batch = db.batch();
    let finalCustomerId = salePayload.customerId;

    try {
        if (salePayload.newCustomerData) {
            if (salePayload.newCustomerData.birth_date) {
                salePayload.newCustomerData.birth_date = admin.firestore.Timestamp.fromDate(new Date(salePayload.newCustomerData.birth_date));
            }
            const newCustomerRef = db.collection('customers').doc();
            batch.set(newCustomerRef, salePayload.newCustomerData);
            finalCustomerId = newCustomerRef.id;
        }

        const saleData = {
            vehicleId: salePayload.vehicleId,
            customerId: finalCustomerId,
            dealerId: dealerId,
            saleDate: new Date(),
            finalPrice: Number(salePayload.finalPrice),
            financing_method: salePayload.financing_method || null,
            trade_in_make: salePayload.trade_in_make || null,
            trade_in_model: salePayload.trade_in_model || null,
            trade_in_vin: salePayload.trade_in_vin || null,
            trade_in_value: salePayload.trade_in_value ? Number(salePayload.trade_in_value) : null,
        };

        const saleRef = db.collection('sales').doc();
        batch.set(saleRef, saleData);

        const vehicleRef = db.collection('vehicles').doc(salePayload.vehicleId);
        batch.update(vehicleRef, {
            status: 'vendido',
            final_delivery_date: new Date(),
            statusHistory: admin.firestore.FieldValue.arrayUnion({ status: 'vendido', date: new Date() }),
        });

        await batch.commit();
        return { success: true, message: 'Sale registered successfully.' };

    } catch (error) {
        console.error("Error registering sale:", error);
        throw new functions.https.HttpsError('internal', 'Error registering sale.');
    }
});

exports.saveForecast = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'factory'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or factory user.');
    }
    const { forecastData } = data;
    if (!forecastData || !forecastData.month || !forecastData.target) {
        throw new functions.https.HttpsError('invalid-argument', 'Month and target are required.');
    }
    await db.collection('forecasts').add(forecastData);
    return { success: true, message: 'Forecast saved successfully.' };
});

exports.completeFollowUp = functions.https.onCall(async (data, context) => {
    if (!isOneOfRoles(context.auth, ['admin', 'dealer'])) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin or dealer user.');
    }
    const { interactionId } = data;
    if (!interactionId) {
        throw new functions.https.HttpsError('invalid-argument', 'interactionId is required.');
    }
    await db.collection('interactions').doc(interactionId).update({ followUpStatus: 'completed' });
    return { success: true, message: 'Follow-up completed successfully.' };
});

exports.createFactoryOrder = functions.https.onCall(async (data, context) => {
    if (!hasRole(context.auth, 'dealer')) {
        throw new functions.https.HttpsError('permission-denied', 'Must be a dealer user.');
    }
    const { orderData } = data;
    if (!orderData || !orderData.make || !orderData.model) {
        throw new functions.https.HttpsError('invalid-argument', 'Make and model are required.');
    }

    const dealerId = context.auth.token.dealerId;
    if (!dealerId) {
        throw new functions.https.HttpsError('permission-denied', 'Dealer user must have a dealerId claim.');
    }

    const newOrder = {
        ...orderData,
        dealerId: dealerId,
        status: 'pendiente',
        createdAt: new Date()
    };

    await db.collection('factory_orders').add(newOrder);
    return { success: true, message: 'Factory order created successfully.' };
});

exports.getDashboardStats = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) {
                functions.logger.error("No authorization token provided.");
                res.status(401).send({ error: 'Unauthorized' });
                return;
            }

            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const { role, dealerId } = decodedToken;
            functions.logger.info(`Fetching stats for role: ${role}, dealerId: ${dealerId || 'N/A'}`);

            let stats = {};

            if (role === 'admin' || role === 'factory') {
                const vehiclesPromise = db.collection('vehicles').get();
                const salesPromise = db.collection('sales').get();
                const dealersPromise = db.collection('dealers').get();

                const [vehiclesSnapshot, salesSnapshot, dealersSnapshot] = await Promise.all([vehiclesPromise, salesPromise, dealersPromise]);
                const vehiclesInStock = vehiclesSnapshot.docs.filter(doc => doc.data().status !== 'vendido').length;

                stats = {
                    vehiclesInStock,
                    totalSales: salesSnapshot.size,
                    totalDealers: dealersSnapshot.size,
                };
            } else if (role === 'dealer') {
                if (!dealerId) {
                    functions.logger.error(`Dealer ${decodedToken.uid} is missing dealerId claim.`);
                    res.status(403).send({ error: 'Permission denied: Dealer is missing dealerId claim.' });
                    return;
                }

                const vehiclesQuery = db.collection('vehicles').where('dealerId', '==', dealerId);
                const salesQuery = db.collection('sales').where('dealerId', '==', dealerId);

                const [vehiclesSnapshot, salesSnapshot] = await Promise.all([vehiclesQuery.get(), salesQuery.get()]);
                const vehiclesInStock = vehiclesSnapshot.docs.filter(doc => doc.data().status !== 'vendido').length;

                stats = {
                    vehiclesInStock,
                    totalSales: salesSnapshot.size,
                };
            } else {
                 functions.logger.warn(`User ${decodedToken.uid} with unhandled role '${role}' called getDashboardStats.`);
            }

            res.status(200).send(stats);

        } catch (error) {
            functions.logger.error("Error in getDashboardStats:", error);
            if (error.code === 'auth/id-token-expired') {
                res.status(401).send({ error: 'Token expired, please re-authenticate.' });
            } else {
                res.status(500).send({ error: 'An unexpected error occurred.' });
            }
        }
    });
});
