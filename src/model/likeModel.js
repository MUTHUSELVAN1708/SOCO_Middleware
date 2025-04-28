import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
    type: { type: String, enum: ['image', 'video'], required: true },
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }, { timestamps: true });
  

const mediaSchemaModel = mongoose.model('media', mediaSchema); 

export default  mediaSchemaModel;
