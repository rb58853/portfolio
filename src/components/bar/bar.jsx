import { useSelector } from 'react-redux'
import './styles/desktop.css'
import './styles/mobile.css'
import { useLocation } from 'react-router-dom'
import { SectionLink } from '../../routes/navigation'
import { Icon } from '@iconify/react/dist/iconify.js'

// Each section is a file open in an editor. The file name is decoration; the
// accessible name of every tab is the section's own name.
export const sectionFiles = {
    home: { to: '/', label: 'Home', file: 'README.md', icon: 'codicon:markdown', tone: 'md', mobileIcon: 'codicon:home', language: 'Markdown' },
    projects: { to: '/projects', label: 'Projects', file: 'projects.py', icon: 'codicon:python', tone: 'py', mobileIcon: 'codicon:code', language: 'Python' },
    experience: { to: '/experience', label: 'Experience', file: 'experience.yaml', icon: 'codicon:list-tree', tone: 'yaml', mobileIcon: 'codicon:briefcase', language: 'YAML' },
    skills: { to: '/skills', label: 'Skills & languages', file: 'skills.yaml', icon: 'codicon:list-tree', tone: 'yaml', mobileIcon: 'codicon:graph', language: 'YAML' },
    about: { to: '/about', label: 'About', file: 'about.md', icon: 'codicon:markdown', tone: 'md', mobileIcon: 'codicon:account', language: 'Markdown' },
}

function Bar() {
    const section = useSelector((state) => state.section).section
    const { pathname } = useLocation()
    const current = sectionFiles[section]

    return section !== 'chat' && <nav className="bar" aria-label='Sections'>
        <div className='barContent'>
            {Object.entries(sectionFiles).map(([key, tab]) => (
                <SectionLink key={key} to={tab.to} aria-label={tab.label}
                    aria-current={section === key ? 'page' : undefined}
                    className={`buttonSection ${section === key ? 'active' : ''}`}>
                    <Icon className={`tabIcon desktop ${tab.tone}`} icon={tab.icon} aria-hidden='true' />
                    <span className='label desktop' aria-hidden='true'>{tab.file}</span>
                    <Icon className='iconSection mobile' icon={tab.mobileIcon} aria-hidden='true' />
                </SectionLink>
            ))}

            <SectionLink state={{ from: pathname }} aria-label='Assistant'
                className={`buttonSection mobile ${section === 'chat' ? 'active' : ''}`} to="/chat">
                <Icon className='iconSection mobile' icon={'codicon:terminal'} aria-hidden='true' />
            </SectionLink>
        </div>

        {current &&
            <div className='barCrumbs desktop' aria-hidden='true'>
                <div className='barCrumbsContent'>
                    <span>rb58853</span>
                    <Icon icon='codicon:chevron-right' />
                    <span>portfolio</span>
                    <Icon icon='codicon:chevron-right' />
                    <Icon className={`tabIcon ${current.tone}`} icon={current.icon} />
                    <span className='barCrumbsFile'>{current.file}</span>
                </div>
            </div>}
    </nav>
}
export default Bar
