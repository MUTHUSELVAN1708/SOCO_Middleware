import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:2007"; // your socket server URL
const userId = "68062193600f323429cb2779"; // change to "User1" or "User2" to test different flows

// Connect with query parameter
const socket = io(SERVER_URL, {
    query: { userId },
    transports: ["websocket"]
});

// When connected
socket.on("connect", () => {
    console.log(`✅ Connected as ${userId}`);
});

// When receiving a message
socket.on("receiveMsg", (msg) => {
    console.log("📥 Received Message:", msg);
});

// Confirmation of sent message
socket.on("sendedMsg", (res) => {
    console.log("📤 Sent Message Response:", res);
});

// Disconnect handler
socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});

// If this is a sender, emit a message after 2 seconds
setTimeout(() => {
    if (userId === "68062193600f323429cb2779") {
        socket.emit("sendMsg", {
            from: "68062193600f323429cb2779",
            to: "68072a0986c2ff11021f13d0",
            message: "Hello from!",
            // post_id: "680764af74a64affd7a36c93",
            // msgType: "img",
            // post_url: "http://122.165.18.7:2007/uploads/1745314991220-scaled_1000001972.jpg"
        });
    }
}, 2000);

// // Auto-disconnect after 10 seconds
// setTimeout(() => {
//     socket.disconnect();
// }, 10000);
