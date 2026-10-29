import { useState } from 'react'
import './styles/desktop.css'
import './styles/mobile.css'
import { SectionLink } from '../../routes/navigation'

function Presentation() {
    const [indexActive, setIndexActive] = useState(-1)

    return (
        <section className='pageSection'>
            <h2 className='pageLabel'>Explore</h2>

            <div className='selectSpace'>
                <Entry to='/projects' label='View my work'
                    active={indexActive === 0}
                    onEnter={() => setIndexActive(0)} onLeave={() => setIndexActive(-1)}>
                    Computer vision, AI and software projects from my studies and from industry, with the technical detail behind each one.
                </Entry>

                <Entry to='/chat' label='Chat with me'
                    active={indexActive === 1}
                    onEnter={() => setIndexActive(1)} onLeave={() => setIndexActive(-1)}>
                    Ask my AI assistant about my experience, projects or skills. It answers on my behalf, using what is published on this site.
                </Entry>
            </div>
        </section>
    )
}

function Entry({ to, label, note, active, onEnter, onLeave, children }) {
    return (
        <SectionLink to={to} className='viewMyWork' onMouseOver={onEnter} onMouseOut={onLeave}>
            <span className={`viewWorkButton ${active ? 'active' : ''}`}>{label}</span>
            {note && <span className='viewMyWorkNote'>{note}</span>}
            <p>{children}</p>
        </SectionLink>
    )
}

export default Presentation
