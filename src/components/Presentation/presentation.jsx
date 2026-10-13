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
                    Designed space to offer you an integrated vision of my practical experience and technical skills, evidenced in real projects executed both during my studies and in work environments.
                </Entry>

                <Entry to='/chat' label='Chat with me' note='VPS missed online (in process)'
                    active={indexActive === 1}
                    onEnter={() => setIndexActive(1)} onLeave={() => setIndexActive(-1)}>
                    Space to interact with my Natural Language Processing AI, designed to provide you with answers about my information, projects, or skills based on your messages. This chat facilitates smooth and direct communication with the AI, allowing you to establish an interactive and effective conversation "with me".
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
