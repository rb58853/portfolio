// The prompt in front of every question, as a shell prints it. Decoration only.
function ShellPrompt() {
    return <span className='chatPrompt' aria-hidden='true'>
        <span className='chatPromptUser'>visitor@rb58853</span>:<span className='chatPromptPath'>~</span>$
    </span>
}

export default ShellPrompt
