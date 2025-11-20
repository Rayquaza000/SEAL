import { createSlice } from "@reduxjs/toolkit";

export const userProfileSlice=createSlice({
    name:"userProfile",
    initialState:{
        email:null
    },
    reducers:{
        setProfile:(state,action)=>{
            const {userEmail,userName}=action.payload;
            state.email=userEmail;
            state.userName=userName;
        }
    }
})

export const {setProfile}=userProfileSlice.actions;

export default userProfileSlice.reducer;