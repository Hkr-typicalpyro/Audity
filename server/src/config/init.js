import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'node:dns';
import dotenv from 'dotenv';

// Resolve .env path relative to this file (src/config/init.js → ../../ = server/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// DEV WORKAROUND: Node.js c-ares DNS resolver defaults to 127.0.0.1 on this
// system, which cannot resolve MongoDB Atlas SRV records. Force Google Public
// DNS before Mongoose or any database models are evaluated in ES modules.
if (process.env.DISABLE_DNS_WORKAROUND !== 'true') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}
