import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "../env"
})

connectDB()























// ;(async()=>{
//     try {
//       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//       console.log(`\n MOngoDB Connected to ${connectionInstance.connection.host}`);
//     } catch (error) {
//         console.error("Error:",error);
//         process.exit(1);
//     }
// })()