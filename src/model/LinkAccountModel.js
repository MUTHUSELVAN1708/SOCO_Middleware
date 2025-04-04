import mongoose from 'mongoose';

const linkAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, // Reference User model
  linkingBusinessAccountId: { type: String, required: true },
  linkStatus: { 
    type: String, 
    enum: ['confirmed', 'pending', 'rejected'], 
    required: true 
  },
  trackInfo: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, 
      status: { type: String, enum: ['confirmed', 'pending', 'rejected'], required: true },
      changedAt: { type: Date, default: Date.now },
      dateTime: { type: String, default: () => new Date().toISOString() }
    }
  ],
}, { versionKey: false, timestamps: true });

const LinkAccountModel = mongoose.model('LinkAccount', linkAccountSchema);

export default LinkAccountModel;
