import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import './styles/desktop.css'
import './styles/mobile.css'

// `index` staggers the entrance animation of the cards of one answer.
function ProjectMessage({ project, comment, index, onOpen }) {
    const cover = project.image || project.images?.[0]

    return (
        <section className="chatCard" style={{ '--i': index }}
            role='button' tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen()
                }
            }}
        >
            <div className="chatCardMedia">
                {cover && <img src={process.env.PUBLIC_URL + cover} alt="" />}
            </div>

            <div className="chatCardText">
                <h4 className="chatCardTitle">{project.title}</h4>
                <Markdown remarkPlugins={[remarkGfm]} className="chatCardComment">
                    {comment}
                </Markdown>
                <span className="chatCardMore">View project</span>
            </div>
        </section>
    )
}

export default ProjectMessage
