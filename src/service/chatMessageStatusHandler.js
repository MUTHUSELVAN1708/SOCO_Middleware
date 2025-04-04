import UserModel from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import ChatMessageModel from "../model/ChatMessageModel.js";

export const setupStatusChangeStream = (io, onlineUsers) => {
    const userChangeStream = UserModel.watch();
    const businessChangeStream = BusinessModel.watch();

    // Listen for client requests to get notification status
    io.on("get-notification-status", async (userId ) => {
        try {
            const user = await UserModel.findById(userId);
            const business = await BusinessModel.findById(userId);

            const hasNotification = user?.isThereAnyNotification || business?.isThereAnyNotification || false;
            
            console.log(`[${new Date().toISOString()}] Sending notification status to ${io.id}: ${hasNotification}`);
            io.emit("notification-status", { userId, hasNotification });

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching notification status:`, error);
        }
    });

    const handleStatusChange = async (change, modelName) => {
        console.log(`[${new Date().toISOString()}] Change detected in ${modelName} collection:`, change);

        if (change.operationType === "update") {
            try {
                const id = change.documentKey._id.toString();
                const updatedFields = change.updateDescription.updatedFields;

                if ("onlineStatus" in updatedFields && updatedFields.onlineStatus === true) {
                    console.log(`[${new Date().toISOString()}] ${modelName} ID ${id} is now online.`);

                    if (onlineUsers[id]) {
                        console.log(`[${new Date().toISOString()}] ${modelName} ID ${id} is already online. Skipping database update.`);
                        return;
                    }

                    onlineUsers[id] = true;

                    await ChatMessageModel.updateMany(
                        { receiverId: id, status: "sent" },
                        { $set: { status: "delivered" } }
                    );

                    console.log(`[${new Date().toISOString()}] Updated messages to 'delivered' for receiver ID: ${id}`);
                } else {
                    console.log(`[${new Date().toISOString()}] ${modelName} ID ${id} went offline or no relevant change.`);
                    delete onlineUsers[id];
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error processing online status update:`, error);
            }
        } else {
            console.log(`[${new Date().toISOString()}] Ignoring non-update operation type: ${change.operationType}`);
        }
    };

    const getAnyNotificationsThere = async (change, modelName) => {
        console.log(`[${new Date().toISOString()}] Checking for notifications in ${modelName} collection:`, change);

        if (change.operationType === "update") {
            try {
                const id = change.documentKey._id.toString();
                const updatedFields = change.updateDescription.updatedFields;

                if ("isThereAnyNotification" in updatedFields) {
                    console.log(`[${new Date().toISOString()}] Notification status changed for ${modelName} ID ${id}. Emitting event.`);

                    io.emit("notificationUpdate", { id, hasNotification: updatedFields.isThereAnyNotification });

                    await UserModel.updateOne(
                        { _id: id },
                        { $set: { isThereAnyNotification: updatedFields.isThereAnyNotification } }
                    );

                    await BusinessModel.updateOne(
                        { _id: id },
                        { $set: { isThereAnyNotification: updatedFields.isThereAnyNotification } }
                    );

                    console.log(`[${new Date().toISOString()}] Updated isThereAnyNotification field for ID: ${id}`);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error processing notification update:`, error);
            }
        } else {
            console.log(`[${new Date().toISOString()}] Ignoring non-update operation type: ${change.operationType}`);
        }
    };

    userChangeStream.on("change", (change) => {
        handleStatusChange(change, "UserModel");
        getAnyNotificationsThere(change, "UserModel");
    });

    businessChangeStream.on("change", (change) => {
        handleStatusChange(change, "BusinessModel");
        getAnyNotificationsThere(change, "BusinessModel");
    });

    // userChangeStream.on("change", (change) => handleStatusChange(change, "UserModel"));
    // businessChangeStream.on("change", (change) => handleStatusChange(change, "BusinessModel"));

    userChangeStream.on("error", (error) => {
        console.error(`[${new Date().toISOString()}] UserModel Change Stream Error:`, error);
    });

    businessChangeStream.on("error", (error) => {
        console.error(`[${new Date().toISOString()}] BusinessModel Change Stream Error:`, error);
    });
};
