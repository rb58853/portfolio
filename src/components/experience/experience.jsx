import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import { Icon } from '@iconify/react/dist/iconify.js'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions.jsx'
import { education, experienceIntro, experienceStats, focusAreas, workExperience } from '../../environment/data/experience.js'

function Experience() {
    const dispatch = useDispatch()

    return (
        <section onFocus={setSectionFunction(dispatch, 'experience')} className='experienceBackground'>
            <div className='experience'>
                <div className='experienceHero'>
                    <div className='experienceHeroText'>
                        <span className='experienceBadge'>Professional Experience</span>
                        <h1 className='experienceTitle'>Applied AI, backend systems, and game development delivered in production environments.</h1>
                        <p className='experienceIntro'>{experienceIntro}</p>
                    </div>

                    <div className='experienceMetricGrid'>
                        {experienceStats.map((item) => (
                            <div className='experienceMetric' key={item.label}>
                                <Icon className='experienceMetricIcon' icon={item.icon} />
                                <div>
                                    <strong>{item.value}</strong>
                                    <span>{item.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='experienceLayout'>
                    <div className='experienceTimeline'>
                        {workExperience.map((job) => (
                            <article className='experienceCard' key={`${job.company}-${job.period}`}>
                                <header className='experienceCardHeader'>
                                    <div className='experienceCompanyMark'>
                                        <Icon icon={job.icon} />
                                    </div>

                                    <div className='experienceHeading'>
                                        <span className='experienceRole'>{job.role}</span>
                                        <h2 className='experienceCompany'>{job.company}</h2>
                                    </div>

                                    <span className='experienceType'>{job.type}</span>
                                </header>

                                <div className='experienceMeta'>
                                    <span><Icon icon='mdi:calendar-month-outline' />{job.period}</span>
                                    <span><Icon icon='mdi:map-marker-outline' />{job.location}</span>
                                </div>

                                <p className='experienceSummary'>{job.summary}</p>

                                <ul className='experienceList'>
                                    {job.achievements.map((achievement) => (
                                        <li key={achievement}>{achievement}</li>
                                    ))}
                                </ul>

                                <div className='experienceStack'>
                                    {job.stack.map((item) => (
                                        <span className='experienceChip' key={item}>{item}</span>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>

                    <aside className='experienceSidebar'>
                        <section className='experiencePanel'>
                            <div className='experiencePanelHeader'>
                                <Icon icon='mdi:school-outline' />
                                <h3>Education</h3>
                            </div>

                            <div className='experienceEducation'>
                                <strong>{education.degree}</strong>
                                <span>{education.institution}</span>
                                <span>{education.location}</span>
                                <span>{education.date}</span>
                            </div>

                            <div className='experienceTags'>
                                {education.coursework.map((item) => (
                                    <span className='experienceChip secondary' key={item}>{item}</span>
                                ))}
                            </div>
                        </section>

                        <section className='experiencePanel'>
                            <div className='experiencePanelHeader'>
                                <Icon icon='mdi:target-variant' />
                                <h3>Focus Areas</h3>
                            </div>

                            <div className='experienceTags'>
                                {focusAreas.map((item) => (
                                    <span className='experienceChip secondary' key={item}>{item}</span>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </section>
    )
}

export default Experience