import express from "express";
import mongoose from "mongoose";
import { usersRoutes } from "./Routes/users.routes.js";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT=process.env.PORT || 4000;

mongoose.connect("mongodb+srv://mehtapratik2001_db_user:jaguar29@cluster0.svrsysp.mongodb.net/SEAL_data?retryWrites=true&w=majority");

const db=mongoose.connection;

db.on("open",()=>{
    console.log("database connection successful");
});

db.on("error",()=>{
    console.log("database connection error");
});

usersRoutes(app);

app.listen(PORT,()=>{
    console.log("Server is running on PORT ",PORT);
});