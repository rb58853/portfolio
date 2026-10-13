import './styles/desktop.css'
import './styles/mobile.css'
import Presentation from "../Presentation/presentation"
import React from 'react'
import { Icon } from '@iconify/react/dist/iconify.js'
import { SectionLink } from '../../routes/navigation'
import ContributionsBox from '../contributions/contributions'
import socials from '../../environment/data/socials'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions'

function Home() {
    const ref = React.useRef(null);
    const dispatch = useDispatch()
    return <section onFocus={setSectionFunction(dispatch, 'home')} className="home"
        ref={ref}>
        <Profile />
        <Presentation app={ref} />
    </section>

}

function Profile() {
    return <div className='profileSection'>
        <div className='profile'>

            <div className='profilePhotoAndName'>
                <img className='photo' src={process.env.PUBLIC_URL + "/images/profile.jpg"} alt="profile" />
                <div>
                    <h3>Raul Beltran</h3>
                    <text>Computer Scientist</text>
                </div>
            </div>
            <div className='line' />

            <div className='info'>
                <a href={socials['cv']} className='infoRow'>
                    <Icon className='icon' icon="mdi:document" />
                    <text> Curriculum vitae</text>
                </a>

                <a href={socials['github']} className='infoRow'>
                    <Icon className='icon' icon="bi:github" />
                    <text> rb58853</text>
                </a>
                <a href={socials['telegram']} className='infoRow'>
                    <Icon className='icon' icon="mdi:telegram" />
                    <text> @rb58853</text>
                </a>

                <a href={socials['gmail']} className='infoRow'>
                    <Icon className='icon' icon="mdi:gmail" />
                    <text> rb58853@gmail.com</text>
                </a>

                <a href={socials['whatsapp']} className='infoRow' target='_blank' rel='noreferrer'>
                    <Icon className='icon' icon="ic:baseline-whatsapp" />
                    <text> Write me on WhatsApp</text>
                </a>

                <div className='infoRow'>
                    <Icon className='icon' icon="mdi:phone" />
                    <text> +34 642 58 15 03</text>
                </div>


                <a href={socials['loc']} className='infoRow'>
                    <Icon className='icon' icon="mdi:location" />
                    <text> Madrid, Spain</text>
                </a>

                <div className='infoRow'>
                    <Icon className='icon' icon="ph:building-apartment-fill" />
                    <text> MATCOM, University of Havana</text>
                </div>

                <div className='infoRow'>
                    <Icon className='icon' icon="hugeicons:passport" />
                    <text> Spanish 🇪🇸</text>
                </div>




                <SectionLink className='aboutText' to="/about">
                    More about me
                </SectionLink>
            </div>
        </div>
        <ContributionsBox />
        {/* <PlusInfo /> */}
    </div>
}

function PlusInfo() {
    return <div className='plusInfo'>
        <a href='https://user-badge.committers.top/cuba/rb58853'>
            <img src="https://user-badge.committers.top/cuba/rb58853.svg" alt="" />
        </a>
    </div>
}
export default Home
