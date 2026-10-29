import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import { InfoBox, Languages, Skills } from "./core"
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions'
import { AskAssistant, assistantQuestions } from '../../aiChatAssistant/askAssistant'

function View() {
    const [info, setInfo] = useState('')
    const [boxInfoActive, setBoxInfoActive] = useState(false)
    // Hovering a skill previews its description; clicking it keeps the
    // description open, with the option to ask the assistant about it.
    const [pinned, setPinned] = useState(null)
    const dispatch = useDispatch()

    useEffect(() => {
        if (!pinned) return undefined

        const onPointerDown = (event) => {
            if (!event.target.closest('.infoBox, .progressBar')) setPinned(null)
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setPinned(null)
        }
        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [pinned])

    const pin = { pinned, setPinned }

    return (<section onFocus={setSectionFunction(dispatch, 'skills')} className='pageShell'>
        <InfoBox info={pinned ? pinned.info : info} active={pinned !== null || Boolean(boxInfoActive)} pinned={pinned !== null}>
            {pinned
                ? <AskAssistant question={assistantQuestions.skill(pinned)}
                    label={`Ask the assistant about ${pinned.name ?? pinned.label}`} />
                : <span className='infoBoxHint'>Click to ask the assistant about it</span>}
        </InfoBox>
        <div className='pageColumn'>
            <header className='pageHeader'>
                <h1 className='pageEyebrow'>Skills & languages</h1>
            </header>

            <Languages setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} {...pin} />
            <Skills setBoxInfoActive={setBoxInfoActive} setInfo={setInfo} boxInfoActive={boxInfoActive} {...pin} />
        </div>
    </section>
    )
}

export default View
