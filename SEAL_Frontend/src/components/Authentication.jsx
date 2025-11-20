import React from 'react'
import { useNavigate } from 'react-router-dom'

const Authentication = () => {
    const navigate=useNavigate();
    function redirectToLoginPage(){
        navigate("/login");
    }
  return (
    <div className='w-full h-fit grow flex flex-row justify-center items-center mt-5 text-white text-[20px] font-medium'>
        
            <span className='pt-3 px-5 pl-15 bg-[#948A54] transform -skew-x-10 hover:bg-white hover:text-[#948A54]' onClick={redirectToLoginPage}>Login</span>
            <span className='pb-3 px-5 pr-15 bg-[#948A54] transform translate-y-full -skew-x-10 -translate-x-1 hover:bg-white hover:text-[#948A54]'>Signup</span>
        </div>
  )
}

export default Authentication