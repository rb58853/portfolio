import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import { createPortal } from 'react-dom'

import skills from '../../environment/data/skills.js'
import languages from '../../environment/data/languages.js'
import { sortDictionaryByValue } from '../../utils/sortDictionary.js'
import { Icon } from '@iconify/react/dist/iconify.js'

// `pinned` makes the box interactive; `children` go in a footer under the text
export function InfoBox({ info, active, pinned = false, children }) {
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className={`infoBox ${active ? 'active' : ''} ${pinned ? 'pinned' : ''}`}>
            {info}
            {children && <div className='infoBoxFooter'>{children}</div>}
        </div>,
        document.body
    )
}


function BarsSection({ title, items, first = false, setBoxInfoActive, setInfo, boxInfoActive, pinned, setPinned }) {
    return (
        <section className={`pageSection ${first ? 'first' : ''}`}>
            <h2 className='pageLabel'>{title}</h2>
            <div className='progressBarsContainer'>
                {SortedBars(items).map((item) => (
                    <ProgressBar key={item.label} label={item.label} icon={item.icon} svg={item.svg} info={item.info} percentage={item.skill} setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive}
                        pinned={pinned?.label === item.label}
                        onPin={() => { setPinned(pinned?.label === item.label ? null : item) }} />
                ))}
            </div>
        </section>
    )
}

export function Languages(props) {
    return <BarsSection title='Languages' items={languages} first {...props} />
}

export function Skills(props) {
    return <BarsSection title='Skills' items={skills} {...props} />
}

function ProgressBar({ label, icon, svg, info, percentage, setBoxInfoActive, setInfo, boxInfoActive, pinned, onPin }) {
    percentage /= 100
    const highlight = pinned || label === boxInfoActive
    return (
        <div className='progressBar'
            role='button' tabIndex={0}
            onClick={onPin}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onPin()
                }
            }}
            onMouseOver={() => {
                setBoxInfoActive(label)
                setInfo(info)
            }}
            onMouseOut={() => {
                setBoxInfoActive(false)
            }}>

            <label className={`progressBarLabel ${highlight ? 'highlight' : ''}`}>

                {icon && <Icon className='skillIcon' icon={icon} />}
                {svg && <img className='skillIconImg' src={svg} alt="" />}

                <span>{label}</span>
            </label>

            <div className='progressBarBackground'>
                <div className={`progress ${highlight ? 'highlight' : ''}`} style={{ width: `calc(100% * ${percentage})` }} />
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
