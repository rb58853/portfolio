import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import Presentation from "../Presentation/presentation"
import { Icon } from '@iconify/react/dist/iconify.js'
import { SectionLink } from '../../routes/navigation'
import ContributionsBox from '../contributions/contributions'
import socials from '../../environment/data/socials'
import { name } from '../../environment/data/about'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions'

const contactRows = [
    { icon: 'mdi:document', text: 'Curriculum vitae', href: socials['cv'] },
    { icon: 'bi:github', text: 'rb58853', href: socials['github'] },
    { icon: 'mdi:telegram', text: '@rb58853', href: socials['telegram'] },
    { icon: 'mdi:gmail', text: 'rb58853@gmail.com', href: socials['gmail'] },
    { icon: 'ic:baseline-whatsapp', text: 'Write me on WhatsApp', href: socials['whatsapp'], external: true },
    { icon: 'mdi:phone', text: '+34 642 58 15 03' },
    { icon: 'mdi:location', text: 'Madrid, Spain', href: socials['loc'] },
    { icon: 'ph:building-apartment-fill', text: 'MATCOM, University of Havana' },
    { icon: 'hugeicons:passport', text: 'Spanish 🇪🇸' },
]

function Home() {
    const dispatch = useDispatch()
    return <section onFocus={setSectionFunction(dispatch, 'home')} className="pageShell">
        <div className='pageColumn'>
            <header className='pageHeader hmHeader'>
                <span className='pageEyebrow'>Portfolio</span>
                <h1 className='hmTitle'>
                    Hello, I'm <span className='hmName'>{name}</span>.
                    <span className='hmRole'>I'm a Computer Scientist.</span>
                </h1>
            </header>

            <Contact />
            <Presentation />
            <ContributionsBox />
        </div>
    </section>

}

function Contact() {
    return <section className='pageSection first'>
        <h2 className='pageLabel'>Contact</h2>
        <div className='hmContactBody'>
            <div className='hmContact'>
                {contactRows.map((row) => {
                    const content = <>
                        <Icon className='hmRowIcon' icon={row.icon} />
                        <span>{row.text}</span>
                    </>

                    return row.href
                        ? <a key={row.text} className='hmRow' href={row.href}
                            {...(row.external ? { target: '_blank', rel: 'noreferrer' } : {})}>{content}</a>
                        : <div key={row.text} className='hmRow'>{content}</div>
                })}
            </div>

            <SectionLink className='hmMore' to="/about">
                More about me
            </SectionLink>
        </div>
    </section>
}

export default Home
