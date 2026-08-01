import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true
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

const Category = mongoose.model('Category', categorySchema);

export default Category;