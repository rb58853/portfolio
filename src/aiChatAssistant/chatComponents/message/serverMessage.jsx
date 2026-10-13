import { useSelector } from 'react-redux'
import './styles/desktop.css'
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ProjectMessage from '../projectMessage/projectMessage';
import projects from '../../../environment/data/projects';
import { useState } from 'react';
import { ProjectWindow } from '../../../components/projects/projects';


function ServerMessage({ data }) {
    const [windowProject, setWindowProject] = useState(false)
    const [project, setProject] = useState(Object.values(projects).length > 0 ? Object.values(projects)[0] : null)

    const header = data['response']

    let projectsView = []
    if (Object.keys(data['projects']).length > 0) {
        const projectsData = data['projects']
        projectsView = Object.keys(projectsData).filter((key) => projects[key]).map((key) => {
            return <ProjectMessage key={key} project={projects[key]} comment={projectsData[key]} windowProject={windowProject} setWindowProject={setWindowProject} setProject={setProject} />
        })
    }
    return (
        <div className="serverMessage">
            {data && <Message projects={projectsView} header={header} />}
            <div className="line" />
            {
                project &&
                <ProjectWindow project={project} setWindowProject={setWindowProject} windowProject={windowProject} />
            }
        </div>
    )
}
function Message({ projects, header }) {

    return (
        <div>
            <Markdown remarkPlugins={[remarkGfm]} className='headerServer'>
                {header}
            </Markdown>
            {
                projects.length > 0 &&
                <div className='projectsMessagesView'>
                    {projects}
                </div>
            }
        </div>
    )
}
export default ServerMessage