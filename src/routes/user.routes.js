import { Router } from "express";
import { registerUser,loginUser,logoutUser } from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { VerfiyJWT } from "../middleware/auth.middleware.js";

const router=Router();

router.route('/register').post(
    
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverImage",maxCount:1}
    ]),
    registerUser)

router.route('./login').post(loginUser)

//Secure routes
router.route('./logout').post(VerfiyJWT, logoutUser)

export default router