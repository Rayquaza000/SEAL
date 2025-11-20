import {configureStore} from '@reduxjs/toolkit';
import  userProfileReducer  from '../slices/userProfileSlice';
export default configureStore({
    reducer:{
        userProfile:userProfileReducer,
    },
 });
