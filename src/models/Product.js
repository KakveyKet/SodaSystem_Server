import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },

    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },

    winMultiplier: {
      type: Number,
      required: [true, 'Win multiplier is required'],
      default: 1,
      min: [0, 'Win multiplier cannot be negative']
    },

    description: {
      type: String,
      default: '',
      trim: true
    },

    status: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: String,
      default: 'System'
    },

    updatedBy: {
      type: String,
      default: 'System'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      }
    }
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;