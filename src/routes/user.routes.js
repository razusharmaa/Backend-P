import { Router } from "express";
import { registerUser,loginUser,logoutUser,RefreshAccessToken,changePassword,changeAvatar,changeCover} from "../controllers/user.controllers.js";
import { upload } from "../middleware/multer.middleware.js";
import { VerifyJWT } from "../middleware/auth.middleware.js";

const router=Router();

router.route('/register').post(
    
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverImage",maxCount:1}
    ]),
    registerUser)

router.route('/login').post(loginUser)

//Secure routes
router.route('/logout').post(VerifyJWT, logoutUser)
router.route('/refresh-token').post(RefreshAccessToken)
router.route('/changepsk').post(changePassword)
router.route('/changeavatar').post(upload.single('newAvatar'),changeAvatar)
router.route('/changecover').post(upload.single('newCover'),changeCover)

export default router