import React from 'react'

const LoginPage = () => {
  return (
    <div className='w-full h-fit grow flex flex-col items-center justify-center'>
        <h1 className='text-[#948A54] font-bold text-[20px]'>Login</h1>
        <div className='flex flex-col border-3 border-solid border-[#948A54] p-4 bg-[#DDD9C3]'>
            <label className='text-[#948A54] font-medium'>Email:</label>
            <input type="email" className='border-2 border-solid border-[#948A54] bg-white'/>
            <label className='text-[#948A54] font-medium'>Password:</label>
            <input type="password" className='border-2 border-solid border-[#948A54] bg-white'/>

        </div>
        <button className='py-1 px-22 border-3 border-solid border-[#948A54] bg-[#DDD9C3] text-[#948A54] font-medium mt-2'>Login</button>
    </div>
  )
}

export default LoginPage