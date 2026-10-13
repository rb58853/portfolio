import { useSelector } from 'react-redux'
import './styles/desktop.css'
import './styles/mobile.css'
import { useLocation } from 'react-router-dom'
import { SectionLink } from '../../routes/navigation'
import { Icon } from '@iconify/react/dist/iconify.js'

function Bar() {
    const section = useSelector((state) => state.section).section
    const { pathname } = useLocation()
    return section !== 'chat' && <div className="bar">
        <div className='barContent'>
            <SectionLink className={`buttonSection ${section === 'home' ? 'active' : ''}`} to="/">
                <text className='label desktop'>HOME</text>
                <Icon className='iconSection mobile' icon={'mingcute:home-4-fill'} />
            </SectionLink>
            <SectionLink className={`buttonSection ${section === 'projects' ? 'active' : ''}`} to="/projects">
                <text className='label desktop'>PROJECTS</text>
                <Icon className='iconSection mobile' icon={'tdesign:code'} />
            </SectionLink>
            <SectionLink className={`buttonSection ${section === 'experience' ? 'active' : ''}`} to="/experience">
                <text className='label desktop'>EXPERIENCE</text>
                <Icon className='iconSection mobile' icon={'mdi:briefcase'} />
            </SectionLink>
            <SectionLink className={`buttonSection ${section === 'skills' ? 'active' : ''}`} to="/skills">
                <text className='label desktop'>SKILLS & LANGUAGES</text>
                <Icon className='iconSection mobile' icon={'ion:stats-chart'} />
            </SectionLink>
            <SectionLink className={`buttonSection ${section === 'about' ? 'active' : ''}`} to="/about">
                <text className='label desktop'>ABOUT</text>
                <Icon className='iconSection mobile' icon={'iconamoon:profile-fill'} />
            </SectionLink>

            <SectionLink state={{ from: pathname }} className={`buttonSection mobile ${section === 'chat' ? 'active' : ''}`} to="/chat">
                <Icon className='iconSection mobile' icon={'majesticons:message'} />
            </SectionLink>
        </div>
    </div>
}
export default Bar

