import React from 'react'

const Footer = () => {
    return (
        <footer className="text-center text-white bg-[#176993] py-2">
            <div>Copyright © {new Date().getFullYear()} structuresOnline.com. </div>
            <div className="text-sm">All rights reserved.Unauthorized use or reproduction is strictly prohibited.</div>
        </footer>
    )
}

export default Footer