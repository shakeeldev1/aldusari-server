import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import articleRoutes from './routes/articles.js';
import adminRoutes from './routes/admins.js';

const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:(process.env.CLIENT_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim().replace(/\/+$/,'')),credentials:true}));
app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:true,limit:'1mb'}));app.use(cookieParser());
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'al-dosari-admin-api'}));
app.use('/api/auth',authRoutes);
app.use('/api/articles',articleRoutes);
app.use('/api/admins',adminRoutes);
app.use((req,res)=>res.status(404).json({message:'Route not found.'}));
app.use((error,_req,res,_next)=>{const status=error.status|| (error.name==='MulterError'?400:500);if(status===500)console.error(error);res.status(status).json({message:status===500?'Server error. Please try again later.':error.message});});

const port=Number(process.env.PORT||4000);
for (const key of ['MONGODB_URI','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET']) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}
connectDatabase().then(()=>app.listen(port,()=>console.log(`Admin API listening on port ${port}`))).catch(error=>{console.error('API startup failed:',error.message);process.exit(1);});
