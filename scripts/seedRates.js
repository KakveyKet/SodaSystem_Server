import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const START_RATE = 65;
const END_RATE = 109;

const seedRates = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/finace_ms";

    console.log("");
    console.log("======================================");
    console.log("          RATE SEEDER");
    console.log("======================================");
    console.log("");
    console.log("Connecting to MongoDB...");

    await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    console.log(`Database: ${mongoose.connection.name}`);

    const ratesCollection =
      mongoose.connection.db.collection("rates");

    const operations = [];

    for (
      let number = START_RATE;
      number <= END_RATE;
      number += 1
    ) {
      operations.push({
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
      });
    }

    console.log(`Preparing ${operations.length} rates...`);

    const result = await ratesCollection.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );

    console.log("");
    console.log("Rate seeding completed.");
    console.log(`Inserted: ${result.upsertedCount || 0}`);
    console.log(`Matched: ${result.matchedCount || 0}`);
    console.log(`Modified: ${result.modifiedCount || 0}`);

    const rates = await ratesCollection
      .find({
        number: {
          $gte: START_RATE,
          $lte: END_RATE,
        },
      })
      .sort({
        number: 1,
      })
      .toArray();

    console.log("");
    console.log(`Total rates: ${rates.length}`);
    console.log("");
    console.log(
      rates
        .map((rate) => `${rate.number}%`)
        .join(", ")
    );
    console.log("");

    if (rates.length === 45) {
      console.log(
        "SUCCESS: All rates from 65% to 109% are ready."
      );
    } else {
      console.log(
        `WARNING: Expected 45 rates but found ${rates.length}.`
      );
    }
  } catch (error) {
    console.error("");
    console.error("SEED ERROR:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
      console.log("");
      console.log("MongoDB disconnected.");
    } catch {
      // Ignore disconnect error.
    }
  }
};

seedRates();
