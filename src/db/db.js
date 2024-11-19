import mongoose from "mongoose"

const db= mongoose.connect("mongodb://localhost:27017/soco")
.then(()=>{
    console.log("connected to mongo db")
}).catch(()=>{
    console.log("error to conect db")
})
export default db

