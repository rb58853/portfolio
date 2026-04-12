import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'

import skills from '../../environment/data/skills.js'
import languages from '../../environment/data/languages.js'
import { sortDictionaryByValue } from '../../utils/sortDictionary.js'
import { Icon } from '@iconify/react/dist/iconify.js'

export function InfoBox({ info, active }) {
    return <div className={`infoBox ${active ? 'active' : ''}`}>
        {info}
    </div>
}


export function Languages({ setBoxInfoActive, setInfo, boxInfoActive }) {
    const languagesView = Object.values(SortedBars(languages)).map((item) => {
        return <ProgressBar label={item.label} icon={item.icon} svg={item.svg} info={item.info} percentage={item.skill} setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} />
    })

    return (
        <div>
            <h1>Languages</h1>
            <div className='progressBarsContainer'>
                {languagesView}
            </div>
        </div>
    )
}

export function Skills({ setBoxInfoActive, setInfo, boxInfoActive }) {
    const skillsView = Object.values(SortedBars(skills)).map((item) => {
        return <ProgressBar label={item.label} icon={item.icon} svg={item.svg} info={item.info} percentage={item.skill} setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} />
    })

    return (
        <div>
            <h1>Skills</h1>
            <div className='progressBarsContainer'>
                {skillsView}
            </div>
        </div>
    )
}

function ProgressBar({ label, icon, svg, info, percentage, setBoxInfoActive, setInfo, boxInfoActive }) {
    percentage /= 100
    return (
        <div className='progressBar'
            onMouseOver={() => {
                setBoxInfoActive(label)
                setInfo(info)
            }}
            onMouseOut={() => {
                setBoxInfoActive(false)
            }}>

            <label className={`progressBarLabel ${label === boxInfoActive ? 'highlight' : ''}`}>

                {icon && <Icon className='skillIcon' icon={icon} />}
                {svg && <img className='skillIconImg' src={svg} alt="icon" />}

                {label}

            </label>

            <div className='progressBarBackground'>
                <div className={`progress ${label === boxInfoActive ? 'highlight' : ''}`} style={{ width: `calc(100% * ${percentage})` }} />
            </div>
        </div>
    )
}

function SortedBars(dic) {
    const tempLanguages = {}

    Object.keys(dic).forEach((item) => {
        tempLanguages[item] = dic[item].skill;
    })

    return Object.keys(sortDictionaryByValue(tempLanguages)).map(item => {
        return dic[item]
    })
}
