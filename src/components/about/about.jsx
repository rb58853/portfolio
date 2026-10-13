import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions.jsx'
import { aboutMe, know, languages, personalInformation, studyFields } from '../../environment/data/personal.js'

function About() {
    const dispatch = useDispatch()
    return (
        <section onFocus={setSectionFunction(dispatch, 'about')} className='aboutBackground'>
            <div className='about'>
                <header className='abHeader'>
                    <span className='abEyebrow'>About</span>
                </header>

                <Section value={aboutMe} className='abLead' />
                <Section value={personalInformation} title='Personal information' className='abDetails' />
                <Section value={studyFields} className='abList' />
                <Section value={know} className='abList' />
                <Section value={languages} className='abList' />
            </div>
        </section>
    )
}

// The data strings open with their own "## Title": it becomes the label of the section.
function splitHeading(value) {
    const match = value.match(/^\s*##\s+(.+)\n([\s\S]*)$/)
    return match ? { title: match[1].trim(), body: match[2] } : { title: '', body: value }
}

function Section({ value, title, className = '' }) {
    const parsed = splitHeading(value)

    return (
        <section className={`abSection ${className}`}>
            <h2 className='abLabel'>{title || parsed.title}</h2>
            <Markdown remarkPlugins={[remarkGfm]} className='abBody'>
                {parsed.body}
            </Markdown>
        </section>
    )
}


export default About
