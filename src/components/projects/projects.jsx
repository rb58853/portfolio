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
import { usePreferences } from '../../preferences/preferencesContext'

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
    return (
        <section onFocus={setSectionFunction(dispatch, 'projects')} className="projects">
            <div className="projectsContent">
                <SkillsBar setSkill={setSkill} skillState={skill} />
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
    const skillsList = ['All']
    Object.values(projects).forEach(project => {
        project.skills.forEach(skill => {
            if (!skillsList.includes(skill))
                skillsList.push(skill)
        })
    })
    skillsList.forEach(skill => {
        buttons.push(
            <button className={`buttonSkill ${skill === skillState ? 'active' : ''}`}
                onClick={() => setSkill(skill)}
            >
                {skill === 'All' ? 'All' : skill}
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
            if (skill === 'All' || project.skills.includes(skill)) {
                length += 1
            }
        })
        setRows(Math.ceil((length / columns)))

        Object.values(projects).forEach((project) => {
            fullIndex += 1
            if (skill === 'All' || project.skills.includes(skill)) {
                index += 1
                let rest = columns - (length % columns);

                let translateX = 100 * (index % columns);
                if (index / columns >= Math.floor(length / columns))
                    translateX += rest * 50;

                temp.push(<ProjectBox
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
    const [activeInfo, setActiveInfo] = useState('')
    const [activeButton, setActiveButton] = useState('')
    const widthFromColumns = 100 / columns;
    const previewAsset = project.image || project.images[0]
    useLayoutEffect(() => {
        if (translate)
            setStateTranslate(translate)
    }, [translate])

    return (
        <div className={`projectBoxAbsolute ${active ? 'active' : ''}`}
            style={
                {
                    transform: `translate(${stateTranslate[0]}%,${stateTranslate[1]}%)`,
                    width: `${widthFromColumns}%`
                }
            }>

            <div className={`projectBox ${active ? 'active' : ''}`}
                onMouseOver={() => { setActiveInfo('active') }}
                onMouseOut={() => { setActiveInfo('') }}
            >
                <div className={`projectBoxInfoBackground ${activeInfo}`} />

                {previewAsset &&
                    <ProjectAsset path={previewAsset} className={`projectBoxImage`} preview={true} />}

                {!project.images[0] && !project.image &&
                    <div className='noImageProject'>
                        <h1> {project.title}</h1>
                    </div>}

                <div className={`projectBoxInfo top ${activeInfo}`}>
                    <h1>{project.title}</h1>
                    <text>{project.languages.join(' / ')}</text>
                </div>

                <div className={`projectBoxInfo bottom ${activeInfo}`}>
                    <button className={`viewProjectButton ${activeButton}`}
                        onMouseOver={() => setActiveButton('active')}
                        onMouseOut={() => setActiveButton('')}
                        onClick={() => {
                            setProject(project)
                            setWindowProject(true)
                        }}
                    >
                        LEARN MORE
                    </button>

                </div>
            </div>
        </div>
    )
}

export function ProjectWindow({ project, setWindowProject, windowProject }) {
    const { theme } = usePreferences()
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



    const details = Object.keys(project.features).map((key) => {
        return <text><b>{key}: </b> {project.features[key]}</text>
    })
    return (
        <div className={`projectWindowBack ${windowProject ? 'active' : ''}`}>
            <InfoBox info={info} active={boxInfoActive} />

            <div className={`projectWindow ${windowProject ? 'active' : ''}`}>

                <ProjectWindowImage key={project.title} project={project} hide={hide} setHide={setHide} />

                <div className='proyectWindowTextSpace'>
                    {project.asStudent && <div className='asStudentFlag'
                        style={{ backgroundColor: env.flagColors[project.asStudent - 1] }}

                        onClick={() => { setBoxInfoActive(!boxInfoActive) }}
                        onMouseOut={() => { setBoxInfoActive(false) }}
                    >
                        <img src={process.env.PUBLIC_URL + "/images/icons/info.svg"} alt="" />
                    </div>}
                    <div className='proyectWindowText'>
                        <h1>{project.title}</h1>
                        <text>{"" + project.skills.join(' / ') + " | " + project.languages.join(' / ')}</text>
                        {/* <div className='line' /> */}

                        <div className='description' ref={textRef}>
                            <div className='features'>
                                {details}
                            </div>
                            <Markdown remarkPlugins={[remarkGfm]}>
                                {project.description}
                            </Markdown>
                        </div>

                        <div className='endBar'>
                            {project.github && <a href={project.github}
                                className={`viewOnGithub ${windowProject ? 'active' : ''}`}> View on github </a>}

                            {project.paper && <a href={process.env.PUBLIC_URL + project.paper}
                                className={`viewOnGithub ${windowProject ? 'active' : ''}`}> Read paper </a>}

                            {project.sitie && <a href={project.sitie}
                                className={`viewOnGithub ${windowProject ? 'active' : ''}`}> Visit site </a>}

                            {project.app && <a href={project.app}
                                className={`viewOnGithub ${windowProject ? 'active' : ''}`}> App </a>}

                            <button className='buttonClose'
                                onClick={() => { setWindowProject(false) }}
                            >
                                <img className='closeImage' src={process.env.PUBLIC_URL + `/images/icons/${theme}/close.png`} alt="" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
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
            path={path}
            className={`carruselImage ${hide ? 'hide' : ''}`}
            width={width}
        />)
    })

    return <div className={`carruselContainer ${hide ? 'hide' : ''}`} ref={carruselRef}
        style={{ maxHeight: !hide ? size.width * 9 / 16 : 33 }}
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
