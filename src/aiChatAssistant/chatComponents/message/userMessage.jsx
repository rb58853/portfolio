import { memo } from 'react'
import './styles/desktop.css'
import './styles/mobile.css'

function UserMessage({ text, current }) {
    return (
        <article className={`chatRow user ${current ? 'current' : ''}`}>
            <span className='chatRowLabel'>You</span>
            <p className='chatQuestion'>{text}</p>
        </article>
    )
}

export default memo(UserMessage)
