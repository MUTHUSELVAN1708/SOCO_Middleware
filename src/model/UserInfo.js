import mongoose from "mongoose";
const { Schema } = mongoose;

const userInfoSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String, required: true },
});

const UserInfo = mongoose.model('UserInfo', userInfoSchema);
export default UserInfo;