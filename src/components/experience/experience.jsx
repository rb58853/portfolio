import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions.jsx'
import { education, experienceIntro, experienceStats, focusAreas, workExperience } from '../../environment/data/experience.js'

function ExperienceItem({ job }) {
    return (
        <li className={`xpItem ${job.current ? 'current' : ''}`}>
            <div className='xpAside'>
                <span className='xpPeriod'>{job.period}</span>
                <span className='xpLocation'>{job.location}</span>
                <span className='xpType'>{job.type}</span>
            </div>

            <div className='xpBody'>
                <header className='xpHead'>
                    <h2 className='xpCompany'>
                        {job.company}
                        {job.current && <span className='xpNow'>Now</span>}
                    </h2>
                    <p className='xpRole'>{job.role}</p>
                </header>

                <p className='xpSummary'>{job.summary}</p>

                <ul className='xpAchievements'>
                    {job.achievements.map((achievement) => (
                        <li key={achievement}>{achievement}</li>
                    ))}
                </ul>

                {job.projects?.length > 0 &&
                    <div className='xpProjects'>
                        <h3 className='xpLabel'>Selected work</h3>
                        <div className='xpProjectGrid'>
                            {job.projects.map((project) => (
                                <article className='xpProject' key={project.name}>
                                    <h4>{project.name}</h4>
                                    <p>{project.description}</p>
                                    {project.stack &&
                                        <span className='xpProjectStack'>{project.stack.join(' · ')}</span>}
                                </article>
                            ))}
                        </div>
                    </div>}

                <ul className='xpStack'>
                    {job.stack.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        </li>
    )
}

function Experience() {
    const dispatch = useDispatch()

    return (
        <section onFocus={setSectionFunction(dispatch, 'experience')} className='experienceBackground'>
            <div className='xp'>
                <header className='xpHeader'>
                    <span className='xpEyebrow'>Experience</span>
                    <h1 className='xpTitle'>Computer vision, applied AI and scalable software, built for production.</h1>
                    <p className='xpIntro'>{experienceIntro}</p>

                    <dl className='xpStats'>
                        {experienceStats.map((item) => (
                            <div className='xpStat' key={item.label}>
                                <dt>{item.value}</dt>
                                <dd>{item.label}</dd>
                            </div>
                        ))}
                    </dl>
                </header>

                <ol className='xpList'>
                    {workExperience.map((job) => (
                        <ExperienceItem job={job} key={`${job.company}-${job.period}`} />
                    ))}
                </ol>

                <footer className='xpFooter'>
                    <section className='xpFooterBlock'>
                        <h3 className='xpLabel'>Education</h3>
                        <p className='xpDegree'>{education.degree}</p>
                        <p className='xpMuted'>{education.institution} · {education.location}</p>
                        <p className='xpMuted'>{education.date}</p>
                        <p className='xpInline'>{education.coursework.join(' · ')}</p>
                    </section>

                    <section className='xpFooterBlock'>
                        <h3 className='xpLabel'>Focus areas</h3>
                        <ul className='xpFocus'>
                            {focusAreas.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </section>
                </footer>
            </div>
        </section>
    )
}

export default Experience
