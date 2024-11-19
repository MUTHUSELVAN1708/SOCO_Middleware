import jwt from "jsonwebtoken";
import "dotenv/config";

import crypto from "crypto";
const SECRET_KEY = crypto.randomBytes(32).toString('hex');


const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    req.user = decoded.userId; 
    next(); 
  } catch (err) {
    console.error("Token verification failed:", err.message); 
    res.status(401).json({ msg: "Invalid token" });
  }
};

export default auth;
