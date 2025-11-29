import mongoose, { Schema, Document } from 'mongoose';

export type ModificationType = 'new_poi' | 'comment' | 'photo' | 'edit_poi';
export type ModificationStatus = 'pending' | 'approved' | 'rejected';

export interface IPendingModification extends Document {
  type: ModificationType;
  userId: mongoose.Types.ObjectId;
  poiId?: mongoose.Types.ObjectId;
  data: any;
  status: ModificationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PendingModificationSchema = new Schema<IPendingModification>(
  {
    type: {
      type: String,
      required: [true, 'Le type de modification est requis'],
      enum: ['new_poi', 'comment', 'photo', 'edit_poi'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'ID utilisateur est requis'],
    },
    poiId: {
      type: Schema.Types.ObjectId,
      ref: 'POI',
      // Optionnel car pour new_poi il n'y a pas encore de POI
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, 'Les données sont requises'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour les requêtes fréquentes
PendingModificationSchema.index({ status: 1, createdAt: -1 });
PendingModificationSchema.index({ userId: 1, status: 1 });
PendingModificationSchema.index({ poiId: 1 });

export default mongoose.model<IPendingModification>('PendingModification', PendingModificationSchema);
