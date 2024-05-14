import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "../env"
})

connectDB()
.then(() =>{
    app.on("error", (err) =>{
        console.log("Server Error:",err);
        process.exit(1);
    })
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err)=>{
    console.log("MongoDB connection Failed:",err);
})






















// ;(async()=>{
//     try {
//       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//       console.log(`\n MOngoDB Connected to ${connectionInstance.connection.host}`);
//     } catch (error) {
//         console.error("Error:",error);
//         process.exit(1);
//     }
// })()