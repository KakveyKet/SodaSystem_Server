import "dotenv/config";
import mongoose from "mongoose";

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!mongoUri) {
  console.error(
    "Missing MONGO_URI, MONGODB_URI, or DATABASE_URL in .env",
  );

  process.exit(1);
}

const repairUsersEmailIndex =
  async () => {
    const users =
      mongoose.connection.collection(
        "users",
      );

    console.log(
      "Cleaning blank user email values...",
    );

    const cleanupResult =
      await users.updateMany(
        {
          $or: [
            {
              email: null,
            },
            {
              email: "",
            },
            {
              email: {
                $type:
                  "string",
                $regex:
                  /^\s*$/,
              },
            },
          ],
        },
        {
          $unset: {
            email: "",
          },
        },
      );

    console.log(
      `Cleaned ${cleanupResult.modifiedCount} user record(s).`,
    );

    const indexes =
      await users.indexes();

    const oldEmailIndex =
      indexes.find(
        (index) =>
          index.name ===
          "email_1",
      );

    if (oldEmailIndex) {
      console.log(
        "Removing old users.email_1 index...",
      );

      await users.dropIndex(
        "email_1",
      );
    }

    /*
     * Detect duplicate real emails before recreating the index.
     */
    const duplicateEmails =
      await users
        .aggregate([
          {
            $match: {
              email: {
                $type:
                  "string",
                $ne: "",
              },
            },
          },
          {
            $group: {
              _id: {
                $toLower:
                  "$email",
              },

              count: {
                $sum: 1,
              },

              userIds: {
                $push:
                  "$_id",
              },
            },
          },
          {
            $match: {
              count: {
                $gt: 1,
              },
            },
          },
        ])
        .toArray();

    if (
      duplicateEmails.length >
      0
    ) {
      console.error(
        "Cannot create the email index because duplicate real emails exist:",
      );

      console.error(
        JSON.stringify(
          duplicateEmails,
          null,
          2,
        ),
      );

      throw new Error(
        "Resolve duplicate real email addresses and run this script again",
      );
    }

    console.log(
      "Creating partial unique users.email_1 index...",
    );

    await users.createIndex(
      {
        email: 1,
      },
      {
        name:
          "email_1",

        unique: true,

        partialFilterExpression: {
          email: {
            $type:
              "string",
          },
        },
      },
    );

    console.log(
      "Optional user email index repaired successfully.",
    );
  };

const cleanCustomerEmails =
  async () => {
    const customers =
      mongoose.connection.collection(
        "customers",
      );

    const result =
      await customers.updateMany(
        {
          $or: [
            {
              email: null,
            },
            {
              email: "",
            },
            {
              email: {
                $type:
                  "string",
                $regex:
                  /^\s*$/,
              },
            },
          ],
        },
        {
          $unset: {
            email: "",
          },
        },
      );

    console.log(
      `Cleaned ${result.modifiedCount} customer email record(s).`,
    );
  };

const run = async () => {
  try {
    await mongoose.connect(
      mongoUri,
    );

    console.log(
      `Connected to MongoDB database: ${mongoose.connection.name}`,
    );

    await repairUsersEmailIndex();
    await cleanCustomerEmails();

    console.log(
      "Email repair completed.",
    );
  } catch (error) {
    console.error(
      "Email index repair failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();