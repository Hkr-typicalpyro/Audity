import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

import Hall from '../src/models/Hall.js';

dotenv.config();

// Same development DNS workaround currently used by the server
dns.setServers(['8.8.8.8', '8.8.4.4']);

const halls = [
  {
    code: 'HALL A',
    name: 'Grand Auditorium',
    floor: 'Level 1',
    entranceGate: 'Entrance Gate 1',
    capacity: 800,
    rentalFee: 145000,
  },
  {
    code: 'HALL B',
    name: 'Skyline Amphitheater',
    floor: 'Level 2',
    entranceGate: 'Entrance Gate 2',
    capacity: 450,
    rentalFee: 88000,
  },
  {
    code: 'HALL C',
    name: 'Executive Tech Suite',
    floor: 'Level 3',
    entranceGate: 'Entrance Gate 3',
    capacity: 180,
    rentalFee: 42000,
  },
];

async function seedHalls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');

    for (const hallData of halls) {
      const existingHall = await Hall.findOne({
        code: hallData.code,
      });

      if (existingHall) {
        console.log(`Skipped: ${hallData.code} already exists`);
        continue;
      }

      await Hall.create(hallData);

      console.log(`Created: ${hallData.code} — ${hallData.name}`);
    }

    console.log('Hall seed complete');
  } catch (error) {
    console.error('Hall seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedHalls();