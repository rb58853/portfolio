import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import projects from '../../environment/data/projects'
import './styles/desktop.css'
import './styles/mobile.css'
import '../../styles/style.css'
import env from '../../environment/env'
import { useSize } from '../../hooks/useSize'
import { studentInfo } from '../../environment/data/about'
import { InfoBox } from '../skillsLanguajes/core'
import { useDispatch } from 'react-redux'
import setSectionFunction from '../../redux/sections/functions'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '@iconify/react/dist/iconify.js'
import { createPortal } from 'react-dom'

const MAIN_CATEGORIES = ['Vision', 'AI', 'Game Dev']
const OTHER_CATEGORY = 'Others'

function inCategory(project, category) {
    if (category === 'All') return true
    if (category === OTHER_CATEGORY) return !project.skills.some((skill) => MAIN_CATEGORIES.includes(skill))
    return project.skills.includes(category)
}

function isVideoAsset(path = '') {
    return path.toLowerCase().endsWith('.webm')
}

function ProjectAsset({ path, className = '', width, preview = false }) {
    const source = process.env.PUBLIC_URL + path

    if (isVideoAsset(path)) {
        return <video
            className={className}
            src={source}
            style={width ? { width } : undefined}
            autoPlay
            loop
            muted
            playsInline
            controls={!preview}
        />
    }

    return <img className={className} src={source} alt='' style={width ? { width } : undefined} />
}


function Projects() {
    const [skill, setSkill] = useState('All')
    const [project, setProject] = useState(Object.values(projects)[0])
    const [windowProject, setWindowProject] = useState(false)
    const dispatch = useDispatch()
    const count = Object.values(projects).filter((item) => inCategory(item, skill)).length
    return (
        <section onFocus={setSectionFunction(dispatch, 'projects')} className="projects">
            <div className="projectsContent">
                <header className='pjHeader'>
                    <span className='pjEyebrow'>Projects</span>
                </header>
                <div className='pjToolbar'>
                    <SkillsBar setSkill={setSkill} skillState={skill} />
                    <span className='pjCount'>{count} {count === 1 ? 'project' : 'projects'}</span>
                </div>
                <Container setProject={setProject} setWindowProject={setWindowProject} skill={skill} />

                {
                    <ProjectWindow project={project} setWindowProject={setWindowProject} windowProject={windowProject} />
                }
            </div>
        </section>
    )
}

function SkillsBar({ setSkill, skillState }) {
    const buttons = []
    const skillsList = ['All', ...MAIN_CATEGORIES, OTHER_CATEGORY]
        .filter((category) => Object.values(projects).some((project) => inCategory(project, category)))
    skillsList.forEach(skill => {
        buttons.push(
            <button key={skill} className={`buttonSkill ${skill === skillState ? 'active' : ''}`}
                onClick={() => setSkill(skill)}
            >
                {skill}
            </button>)
    })

    return (
        <div className='skillsBar'>
            {buttons}
        </div>
    )
}

function Container({ setProject, setWindowProject, skill }) {
    const [projectsView, setProjectsView] = useState([])
    const [columns, setColums] = useState(3)
    const [rows, setRows] = useState(0)
    const projectsContainerRef = useRef()
    const size = useSize(projectsContainerRef)

    //TODO Jugar con el width
    useLayoutEffect(() => {
        const tempWidth = size.width >= 1000 ? env.boxProjectBigMinWidth : (size.width >= 800 ? env.boxProjectMinWidth : (size.width >= 600 ? env.boxProjectBigMinWidthMobile : env.boxProjectMinWidthMobile))

        if (size.width / (columns + 1) > tempWidth)
            setColums(columns + 1)
        if (size.width / columns < tempWidth)
            setColums(columns - 1)

    }, [size, columns])

    useEffect(() => {
        let index = -1;
        let fullIndex = -1;
        let temp = [];
        let length = 0;

        Object.values(projects).forEach((project) => {
            if (inCategory(project, skill)) {
                length += 1
            }
        })
        setRows(Math.ceil((length / columns)))

        Object.values(projects).forEach((project) => {
            fullIndex += 1
            if (inCategory(project, skill)) {
                index += 1
                let rest = columns - (length % columns);

                let translateX = 100 * (index % columns);
                if (index / columns >= Math.floor(length / columns))
                    translateX += rest * 50;

                temp.push(<ProjectBox
                    key={project.title}
                    project={project}
                    setProject={setProject}
                    setWindowProject={setWindowProject}
                    active={true}
                    translate={[translateX, 100 * Math.floor(index / columns)]}
                    columns={columns}
                />)
            }
            else {

                temp.push(<ProjectBox
                    key={project.title}
                    project={project}
                    setProject={setProject}
                    setWindowProject={setWindowProject}
                    active={false}
                    columns={columns}
                />)
            }
        })
        setProjectsView(temp)
    }, [skill, columns, setWindowProject, setProject])

    return (
        <div className='projectsContainer'
            ref={projectsContainerRef}
            style={{ height: ((size.width * 3 / 4) / columns) * rows }}
        >
            {projectsView}
        </div>
    )
}

export function ProjectBox({ project, setProject, setWindowProject, active, translate, columns }) {
    const [stateTranslate, setStateTranslate] = useState(translate)
    const widthFromColumns = 100 / columns;
    const previewAsset = project.image || project.images[0]
    useLayoutEffect(() => {
        if (translate)
            setStateTranslate(translate)
    }, [translate])

    const open = () => {
        setProject(project)
        setWindowProject(true)
    }

    return (
        <div className={`projectBoxAbsolute ${active ? 'active' : ''}`}
            style={
                {
                    transform: `translate(${stateTranslate[0]}%,${stateTranslate[1]}%)`,
                    width: `${widthFromColumns}%`
                }
            }>

            <div className={`projectBox ${active ? 'active' : ''}`}
                role='button'
                tabIndex={active ? 0 : -1}
                aria-label={project.title}
                onClick={open}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        open()
                    }
                }}
            >
                {previewAsset
                    ? <ProjectAsset path={previewAsset} className={`projectBoxImage`} preview={true} />
                    : <div className='noImageProject' />}

                <div className={`projectBoxCaption ${previewAsset ? '' : 'static'}`}>
                    <h2>{project.title}</h2>
                    <span>{project.languages.join(' / ')}</span>
                </div>
            </div>
        </div>
    )
}

export function ProjectWindow({ project, setWindowProject, windowProject }) {
    const textRef = React.useRef();
    const [boxInfoActive, setBoxInfoActive] = useState(false)
    const info = studentInfo(project.asStudent)
    //Se usa hide desde aqui para que se aplique a todos las vistas de proyecto
    const [hide, setHide] = useState(false)



    useEffect(() => {

        textRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [windowProject])

    useEffect(() => {
        const html = document.documentElement
        const body = document.body

        const previousHtmlOverflow = html.style.overflow
        const previousBodyOverflow = body.style.overflow

        if (windowProject) {
            html.style.overflow = 'hidden'
            body.style.overflow = 'hidden'
        }

        return () => {
            html.style.overflow = previousHtmlOverflow
            body.style.overflow = previousBodyOverflow
        }
    }, [windowProject])



    useEffect(() => {
        if (!windowProject) return undefined

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setWindowProject(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [windowProject, setWindowProject])

    const details = Object.keys(project.features).map((key) => {
        return <React.Fragment key={key}>
            <dt>{key}</dt>
            <dd>{project.features[key]}</dd>
        </React.Fragment>
    })
    const links = [
        project.github && { href: project.github, label: 'View on GitHub' },
        project.paper && { href: process.env.PUBLIC_URL + project.paper, label: 'Read paper' },
        project.sitie && { href: project.sitie, label: 'Visit site' },
        project.app && { href: project.app, label: 'App' },
    ].filter(Boolean)
    const modal = (
        <div className={`projectWindowBack ${windowProject ? 'active' : ''}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) setWindowProject(false)
            }}
        >
            <InfoBox info={info} active={boxInfoActive} />

            <div className={`projectWindow ${windowProject ? 'active' : ''}`}>
                <button className='buttonClose' aria-label='Close'
                    onClick={() => { setWindowProject(false) }}
                >
                    <Icon icon='mdi:close' />
                </button>

                <ProjectWindowImage key={project.title} project={project} hide={hide} setHide={setHide} />

                <div className='proyectWindowTextSpace'>
                    <div className='proyectWindowText'>
                        <h1>{project.title}</h1>
                        <div className='pwMeta'>
                            <span className='pwTags'>{project.skills.filter(Boolean).join(' · ')}</span>
                            <span className='pwLanguages'>{project.languages.join(' / ')}</span>
                            {project.asStudent && <button className='asStudentFlag'
                                onClick={() => { setBoxInfoActive(!boxInfoActive) }}
                                onMouseOut={() => { setBoxInfoActive(false) }}
                            >
                                <Icon icon='mdi:information-outline' />
                                Student project · year {project.asStudent}
                            </button>}
                        </div>

                        <div className='description' ref={textRef}>
                            {details.length > 0 && <dl className='features'>
                                {details}
                            </dl>}
                            <Markdown remarkPlugins={[remarkGfm]}>
                                {project.description}
                            </Markdown>
                        </div>

                        {links.length > 0 && <div className='endBar'>
                            {links.map((link) => <a key={link.label} href={link.href}
                                className={`viewOnGithub ${windowProject ? 'active' : ''}`}>{link.label}</a>)}
                        </div>}
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}

function ProjectWindowImage({ project, hide, setHide }) {
    const carruselRef = React.useRef();
    const carruselImagesRef = React.useRef();
    const { width } = useSize(carruselRef)
    const [indexImage, setIndexImage] = useState(0)
    const size = useSize(carruselRef)
    const assets = project.images?.length ? project.images : (project.image ? [project.image] : [])

    useEffect(() => {
        carruselImagesRef.current.scrollTo({
            left: width * indexImage,
            behavior: 'smooth'
        });
    }, [indexImage, width])

    const images = [];
    assets.forEach(path => {
        images.push(<ProjectAsset
            key={path}
            path={path}
            className={`carruselImage ${hide ? 'hide' : ''}`}
            width={width}
        />)
    })

    return <div className={`carruselContainer ${hide ? 'hide' : ''}`} ref={carruselRef}
        style={{ maxHeight: !hide ? Math.min(size.width * 9 / 16, window.innerHeight * 0.46) : 33 }}
    >
        {
            images.length - 1 > indexImage &&
            <Icon className={`switchImageButton next ${hide ? 'hide' : ''}`} icon={'mdi:chevron-right'}
                onClick={() => setIndexImage(Math.min(indexImage + 1, images.length - 1))}
            />
        }
        {
            indexImage > 0 &&
            <Icon className={`switchImageButton back ${hide ? 'hide' : ''}`} icon={'mdi:chevron-left'}
                onClick={() => setIndexImage(Math.max(indexImage - 1, 0))}
            />

        }

        <Icon className={`buttonImageHide ${hide ? 'hide' : ''}`} icon={`${hide ? 'mdi:chevron-down' : 'mdi:chevron-up'}`}
            onClick={() => { setHide(!hide) }} />

        <div className='carrusel' ref={carruselImagesRef}>
            {images}
        </div>
    </div>

}

export default Projects
