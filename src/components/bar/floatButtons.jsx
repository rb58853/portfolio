import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import './styles/desktop.css'
import { usePreferences } from "../../preferences/preferencesContext";

export function ChatButton() {
    return <Link to='/chat'>
        <Icon className={`chatButton desktop active`} icon={'ci:chat'}/>
    </Link>
}

export function ThemeButton() {
    const { theme, toggleTheme } = usePreferences()

    return (
        <button
            className='themeToggleButton'
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <Icon icon={theme === 'dark' ? 'line-md:moon-filled-alt-to-sunny-filled-loop-transition' : 'line-md:sunny-filled-loop-to-moon-filled-alt-loop-transition'} />
        </button>
    )
}
