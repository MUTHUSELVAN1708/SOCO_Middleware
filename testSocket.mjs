// import { io } from "socket.io-client";

// const SERVER_URL = "http://localhost:2007"; // your socket server URL
// const userId = "68062193600f323429cb2779"; // change to "User1" or "User2" to test different flows

// // Connect with query parameter
// const socket = io(SERVER_URL, {
//     query: { userId },
//     transports: ["websocket"]
// });

// // When connected
// socket.on("connect", () => {
//     console.log(`✅ Connected as ${userId}`);
// });

// // When receiving a message
// socket.on("receiveMsg", (msg) => {
//     console.log("📥 Received Message:", msg);
// });

// // Confirmation of sent message
// socket.on("sendedMsg", (res) => {
//     console.log("📤 Sent Message Response:", res);
// });

// // Disconnect handler
// socket.on("disconnect", () => {
//     console.log("❌ Disconnected");
// });

// // If this is a sender, emit a message after 2 seconds
// setTimeout(() => {
//     if (userId === "68062193600f323429cb2779") {
//        socket.emit("sendMsg", {
//     from: "68062193600f323429cb2779",
//     to: "68072a0986c2ff11021f13d0",
//     message: " ", // Required if msgType is "text"
//     msgType: "document",
//     post_url: "http://122.165.18.7:2007/uploads/myfile.pdf",
//     fileName: "myfile.pdf",
//     fileSize: 120345  // <-- Add the correct file size in bytes
// });

//     }
// }, 2000);

// // // Auto-disconnect after 10 seconds
// // setTimeout(() => {
// //     socket.disconnect();
// // }, 10000);




import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:2007";
const userId = "68062193600f323429cb2779"; // Sender

const socket = io(SERVER_URL, {
    query: { userId },
    transports: ["websocket"]
});

// When connected
socket.on("connect", () => {
    console.log(`✅ Connected as ${userId}`);
});

// Receiving message
socket.on("receiveMsg", (msg) => {
    console.log("📥 Received Message:", msg);
});

// Confirmation from server
socket.on("sendedMsg", (res) => {
    console.log("📤 Sent Message Response:", res);
});

// On disconnect
socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});

// Send a test post message to trigger SharedPosts logic
setTimeout(() => {
    if (userId === "68062193600f323429cb2779") {
        socket.emit("sendMsg", {
            from: "68062193600f323429cb2779",
            to: "68072a0986c2ff11021f13d0",
            message: "", // Not needed for post type
            post_id: "684819b5aa841e31578c78c2", // Example post_id
            msgType: "post",
            post_url: null,  // Not required for "post" msgType
            fileName: null,
            fileSize: null
        });
    }
}, 2000);

// Optional: Disconnect after some time
// setTimeout(() => {
//     socket.disconnect();
// }, 10000);
