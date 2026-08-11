import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/*
|--------------------------------------------------------------------------
| Rate Seeder
|--------------------------------------------------------------------------
|
| Rates:
|
| 65%
| 70%
| 75%
| 80%
| 85%
| 90%
| 95%
| 100%
| 101%
| 102%
| 103%
| 104%
| 105%
| 106%
| 107%
| 108%
| 109%
|
*/

const RATE_VALUES = [
  65, 70, 75, 80, 85, 90, 95, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
];

const seedRates = async () => {
  try {
    /*
    |--------------------------------------------------------------------------
    | MongoDB connection
    |--------------------------------------------------------------------------
    */

    const mongoUri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finace_ms";

    console.log("");
    console.log("========================================");
    console.log("             RATE SEEDER");
    console.log("========================================");

    console.log("");
    console.log("Connecting to MongoDB...");

    await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    console.log(`Database: ${mongoose.connection.name}`);

    /*
    |--------------------------------------------------------------------------
    | Rates collection
    |--------------------------------------------------------------------------
    */

    const ratesCollection = mongoose.connection.db.collection("rates");

    /*
    |--------------------------------------------------------------------------
    | Build seed operations
    |--------------------------------------------------------------------------
    */

    const operations = RATE_VALUES.map((number) => ({
      updateOne: {
        filter: {
          number,
        },

        update: {
          $set: {
            name: `${number}%`,
            number,
            status: true,
            updatedAt: new Date(),
          },

          $setOnInsert: {
            createdAt: new Date(),
          },
        },

        upsert: true,
      },
    }));

    console.log("");
    console.log(`Preparing ${operations.length} rates...`);

    /*
    |--------------------------------------------------------------------------
    | Insert/update rates
    |--------------------------------------------------------------------------
    */

    const result = await ratesCollection.bulkWrite(operations, {
      ordered: false,
    });

    console.log("");
    console.log("Rate seeding completed.");

    console.log(`Inserted: ${result.upsertedCount || 0}`);

    console.log(`Matched: ${result.matchedCount || 0}`);

    console.log(`Modified: ${result.modifiedCount || 0}`);

    /*
    |--------------------------------------------------------------------------
    | Verify seeded rates
    |--------------------------------------------------------------------------
    */

    const rates = await ratesCollection
      .find({
        number: {
          $in: RATE_VALUES,
        },
      })
      .sort({
        number: 1,
      })
      .toArray();

    console.log("");
    console.log(`Total seeded rates: ${rates.length}`);

    console.log("");

    console.log(rates.map((rate) => `${rate.number}%`).join(", "));

    console.log("");

    if (rates.length === RATE_VALUES.length) {
      console.log("SUCCESS: All required rates are ready.");
    } else {
      console.log(
        `WARNING: Expected ${RATE_VALUES.length} rates but found ${rates.length}.`,
      );
    }
  } catch (error) {
    console.error("");
    console.error("RATE SEEDER ERROR:");

    console.error(error);

    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();

      console.log("");
      console.log("MongoDB disconnected.");
    } catch {
      // Ignore disconnect error
    }
  }
};

seedRates();
