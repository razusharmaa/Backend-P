import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new Schema({
    videpFile:{
        type:String,  //cloudnary url
        required:true,
        
    },
    thumbnail:{
        type:String,
        
    },
    title:{
        type:String,
        required:true,
        trim:true
    },
    description:{
        type:String,
        required:true,
       
    },
   durations:{
    type:number,  //cloudnary
    required:true,
    
   },
    
   views:{
    type:number,
    required:true,
    default:0
   },
   isPublished:{
    type:Boolean,
    required:true,
    default:false
   },
   owner:{
    type:Schema.Types.ObjectId,
    ref:"User"
   },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"Channel",
        required:true
    }
},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate);

const Video=mongoose.model("Video",videoSchema);