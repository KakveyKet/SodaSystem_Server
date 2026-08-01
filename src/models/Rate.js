import mongoose from 'mongoose';

const rateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rate name is required'],
      trim: true
    },

    number: {
      type: Number,
      required: [true, 'Rate number is required'],
      min: [0, 'Rate number cannot be negative']
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

rateSchema.pre('validate', function () {
  if (!this.name && this.number !== null && this.number !== undefined) {
    this.name = `${this.number}%`;
  }
});

const Rate = mongoose.model('Rate', rateSchema);

export default Rate;