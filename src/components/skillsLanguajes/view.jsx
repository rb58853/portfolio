import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import { InfoBox, Languages, Skills } from "./core"
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions'

function View() {
    const [info, setInfo] = useState('')
    const [boxInfoActive, setBoxInfoActive] = useState(false)
    const dispatch = useDispatch()

    return (<section onFocus={setSectionFunction(dispatch, 'skills')} className='pageShell'>
        <InfoBox info={info} active={boxInfoActive} />
        <div className='pageColumn'>
            <header className='pageHeader'>
                <span className='pageEyebrow'>Skills & languages</span>
            </header>

            <Languages setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} />
            <Skills setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} />
        </div>
    </section>
    )
}

export default View
