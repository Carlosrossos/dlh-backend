import mongoose, { Schema, Document } from 'mongoose';

export type POICategory = 'Spot' | 'Cabane' | 'Refuge';
export type SunExposition = 'Nord' | 'Sud' | 'Est' | 'Ouest' | 'Nord-Est' | 'Nord-Ouest' | 'Sud-Est' | 'Sud-Ouest';
export type Massif = 'Mont Blanc' | 'Vanoise' | 'Écrins' | 'Queyras' | 'Mercantour' | 'Vercors' | 'Chartreuse' | 'Bauges' | 'Aravis' | 'Belledonne';

export interface IComment {
  id: string;
  author: string;
  userId: mongoose.Types.ObjectId;
  text: string;
  date: Date;
}

export interface IPOI extends Document {
  name: string;
  category: POICategory;
  massif: Massif;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  altitude: number;
  sunExposition: SunExposition;
  photos: string[];
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
  comments: IComment[];
  createdBy: mongoose.Types.ObjectId;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const POISchema = new Schema<IPOI>(
  {
    name: {
      type: String,
      required: [true, 'Le nom du POI est requis'],
      trim: true,
      minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    },
    category: {
      type: String,
      required: [true, 'La catégorie est requise'],
      enum: ['Spot', 'Cabane', 'Refuge'],
    },
    massif: {
      type: String,
      required: [true, 'Le massif est requis'],
      enum: ['Mont Blanc', 'Vanoise', 'Écrins', 'Queyras', 'Mercantour', 'Vercors', 'Chartreuse', 'Bauges', 'Aravis', 'Belledonne'],
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'La latitude est requise'],
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: [true, 'La longitude est requise'],
        min: -180,
        max: 180,
      },
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      minlength: [10, 'La description doit contenir au moins 10 caractères'],
      maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères'],
    },
    altitude: {
      type: Number,
      required: [true, 'L\'altitude est requise'],
      min: 0,
      max: 9000,
    },
    sunExposition: {
      type: String,
      required: false,
      enum: ['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'],
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 10;
        },
        message: 'Maximum 10 photos autorisées',
      },
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    comments: {
      type: [CommentSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Index pour la recherche géographique
POISchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });
POISchema.index({ massif: 1, category: 1 });
POISchema.index({ status: 1 });

export default mongoose.model<IPOI>('POI', POISchema);
