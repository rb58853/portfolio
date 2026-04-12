import socials from '../../environment/data/socials.js'
import './styles/desktop.css'


function Contact() {
    const socialKeys = ['github', 'gmail', 'telegram', 'whatsapp']
    const socialsView = socialKeys.filter((key) => socials[key]).map((key) => {
        return <ButtonSocial social={key} />
    })

    return (
        <div className="contact">
            <div className='socials'>
                {socialsView}
            </div>
        </div>
    )
}

function ButtonSocial({ social }) {
    const href = socials[social]
    return (
        <a href={href} className='socialButton'>
            <img
                className='socialIcon'
                src={process.env.PUBLIC_URL + `/images/icons/socials/${social}.svg`} alt="" />
        </a>
    )
}
export default Contact