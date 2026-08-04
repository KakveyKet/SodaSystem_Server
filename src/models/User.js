import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

export const USER_ROLES = ["admin", "user", "customer"];

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: [150, "Name cannot exceed 150 characters"],
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [100, "Username cannot exceed 100 characters"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      unique: true,
      sparse: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      validate: {
        validator(value) {
          return (
            value === undefined ||
            value === null ||
            value === "" ||
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          );
        },
        message: "Please provide a valid email address",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must contain at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: "Role must be admin, user, or customer",
      },
      default: "user",
    },

    status: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_document, object) {
        delete object.password;
        return object;
      },
    },
    toObject: {
      virtuals: true,
      transform(_document, object) {
        delete object.password;
        return object;
      },
    },
  },
);

userSchema.pre("validate", function normalizeUserFields() {
  if (typeof this.name === "string") {
    this.name = this.name.trim();
  }

  if (typeof this.username === "string") {
    this.username = this.username.trim().toLowerCase();
  }

  if (typeof this.email === "string") {
    const email = this.email.trim().toLowerCase();
    this.email = email || undefined;
  }

  if (typeof this.role === "string") {
    this.role = this.role.trim().toLowerCase();
  }
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const configuredRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const rounds =
    Number.isInteger(configuredRounds) && configuredRounds >= 4
      ? configuredRounds
      : 12;

  this.password = await bcrypt.hash(this.password, rounds);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!candidate || !this.password) {
    return false;
  }

  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.matchPassword = async function matchPassword(candidate) {
  return this.comparePassword(candidate);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
