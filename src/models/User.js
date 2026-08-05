import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        150,
        "Name cannot exceed 150 characters",
      ],
    },

    username: {
      type: String,
      required: [
        true,
        "Username is required",
      ],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [
        100,
        "Username cannot exceed 100 characters",
      ],
    },

    /*
    |--------------------------------------------------------------------------
    | Optional email
    |--------------------------------------------------------------------------
    */

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      maxlength: [
        254,
        "Email cannot exceed 254 characters",
      ],
      validate: {
        validator(value) {
          if (
            value === undefined ||
            value === null ||
            value === ""
          ) {
            return true;
          }

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value,
          );
        },

        message:
          "Please provide a valid email address",
      },
    },

    password: {
      type: String,
      required: [
        true,
        "Password is required",
      ],
      minlength: [
        6,
        "Password must contain at least 6 characters",
      ],
      select: false,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "user",
        "customer",
      ],

      /*
       * Normal users default to user.
       *
       * The admin-register controller explicitly assigns admin.
       */
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
      transform(document, result) {
        delete result.password;

        return result;
      },
    },

    toObject: {
      transform(document, result) {
        delete result.password;

        return result;
      },
    },
  },
);

/*
|--------------------------------------------------------------------------
| Normalize fields
|--------------------------------------------------------------------------
*/

userSchema.pre(
  "validate",
  function normalizeUserFields() {
    if (
      typeof this.name ===
      "string"
    ) {
      this.name = this.name
        .replace(/\s+/g, " ")
        .trim();
    }

    if (
      typeof this.username ===
      "string"
    ) {
      this.username =
        this.username
          .trim()
          .toLowerCase();
    }

    if (
      this.email === undefined ||
      this.email === null
    ) {
      this.email = undefined;
    } else if (
      typeof this.email ===
      "string"
    ) {
      const normalizedEmail =
        this.email
          .trim()
          .toLowerCase();

      this.email =
        normalizedEmail ||
        undefined;
    }
  },
);

/*
|--------------------------------------------------------------------------
| Password hashing
|--------------------------------------------------------------------------
*/

userSchema.pre(
  "save",
  async function hashPassword() {
    if (
      !this.isModified(
        "password",
      )
    ) {
      return;
    }

    const salt =
      await bcrypt.genSalt(12);

    this.password =
      await bcrypt.hash(
        this.password,
        salt,
      );
  },
);

/*
|--------------------------------------------------------------------------
| Compare password
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword =
  async function comparePassword(
    enteredPassword,
  ) {
    if (
      !enteredPassword ||
      !this.password
    ) {
      return false;
    }

    return bcrypt.compare(
      enteredPassword,
      this.password,
    );
  };

userSchema.methods.matchPassword =
  userSchema.methods.comparePassword;

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

userSchema.index(
  {
    email: 1,
  },
  {
    name: "email_1",
    unique: true,

    partialFilterExpression: {
      email: {
        $type: "string",
      },
    },
  },
);

userSchema.index({
  role: 1,
  status: 1,
});

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema,
  );

export default User;