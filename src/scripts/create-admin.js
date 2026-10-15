import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database.js';
import Admin from '../models/Admin.js';

const [name,email,password]=process.argv.slice(2);
if(!name||!email||!password){console.error('Usage: npm run admin:create -- "Admin name" admin@example.com "strong-password"');process.exit(1);}
if(password.length<10){console.error('Admin password must be at least 10 characters.');process.exit(1);}
await connectDatabase();
const passwordHash=await bcrypt.hash(password,12);
const admin=await Admin.findOneAndUpdate({email:email.toLowerCase()},{name,email:email.toLowerCase(),passwordHash},{upsert:true,new:true,setDefaultsOnInsert:true});
console.log(`Admin account ready for ${admin.email}`);
await (await import('mongoose')).default.disconnect();
