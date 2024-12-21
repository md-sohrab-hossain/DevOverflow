import { model, models, Schema, Document } from 'mongoose';

// Define the interface for the User model
export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  bio?: string;
  image: string;
  location?: string;
  portfolio?: string;
  reputation?: number;
}

// Define the User schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    bio: { type: String, default: '' },
    image: { type: String, required: true },
    location: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    reputation: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = models?.User || model<IUser>('User', UserSchema);

export default User;
