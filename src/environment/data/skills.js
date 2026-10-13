// `name` is how the assistant is asked about a skill when its label is an abbreviation
const skills =
{
    reactJs: {
        label: 'ReactJs',
        name: 'ReactJS',
        info: 'ReactJS, also known as React.js or ReactJS, is an open-source and free JavaScript library for building user interfaces based on components. It is used to build the user-facing part of a web application. React allows developers to create interactive and dynamic web applications by creating and nesting components and other functionalities',
        skill: 75,
        icon: 'logos:react'
    },
    reactNative: {
        label: 'R. Native',
        name: 'React Native',
        info: 'React Native is a mobile application development framework that uses React, a JavaScript library for building user interfaces, and allows developers to create native applications for iOS and Android using JavaScript and React. Unlike React, which is used for developing web applications, React Native focuses on mobile application development, using native components instead of web components ',
        skill: 62,
        icon: 'skill-icons:react-dark'
    },

    ai: {
        label: 'AI',
        name: 'artificial intelligence',
        info: 'Artificial Intelligence covers the design of systems capable of solving problems that normally require human reasoning, including planning, search, optimization, probabilistic reasoning, knowledge representation, and applied intelligent automation. It provides the theoretical and practical foundation for building decision-capable software across research and production environments.',
        skill: 84,
        // icon: 'logos:openai-icon',
        svg: process.env.PUBLIC_URL + "/images/icons/skills/ai2.png",
    },

    llmAi: {
        label: 'LLM / AI',
        name: 'LLMs and applied AI',
        info: 'Large Language Model and applied AI work focused on prompt engineering, agent design, retrieval-augmented generation, tool orchestration, evaluation, and production integration. This includes building assistants that connect models with external systems, shaping reliable prompts, and designing flows that improve accuracy, traceability, and user value.',
        skill: 97,
        icon: 'simple-icons:openai'
    },

    simulation: {
        label: 'Simulation',
        info: "Computer simulation is an attempt to model real-world situations using a computer program. This type of simulation has become a useful tool for modeling many natural systems in physics, chemistry, biology, and human systems such as economics and social sciences. Computer simulation is used to study how the system works, either by changing variables or making predictions about the system's behavior",
        skill: 45,
        icon: 'flat-ui:pc'
    },
    machineLearning: {
        label: 'ML',
        name: 'machine learning',
        info: 'Machine Learning (ML) is a branch of artificial intelligence (AI) that focuses on developing computer systems capable of learning from data and improving their performance over time without needing to be explicitly programmed. It is applicable across a wide range of industries, including healthcare, defense, financial services, marketing, and security services. Machine learning is a rapidly growing field with numerous research and development opportunities',
        skill: 85,
        // icon: 'logos:tensorflow',
        svg: process.env.PUBLIC_URL + "/images/icons/skills/openAI.png",
    },

    computerVision: {
        label: 'Vision',
        name: 'computer vision',
        info: 'Computer vision for production systems: object and keypoint detection, point-cloud processing, OCR, camera calibration and pixel-to-robot coordinate mapping. Applied to industrial robot guidance, with models trained, benchmarked and deployed on GPU through ONNX Runtime.',
        skill: 88,
        icon: 'mdi:eye-outline'
    },

    pytorch: {
        label: 'PyTorch',
        info: 'PyTorch is an open-source deep learning framework used to build, train and export neural networks. Used here for detection and pose models, hyperparameter search with Optuna and export to ONNX for low-latency inference.',
        skill: 82,
        icon: 'logos:pytorch-icon'
    },

    net: {
        label: '.Net',
        name: '.NET',
        info: '.NET is a software development framework created by Microsoft that provides a runtime environment and a set of libraries and tools for building and running applications on Windows operating systems. This framework includes a variety of programming languages, such as C#, F#, and Visual Basic, and supports a range of application types, including desktop, web, mobile, and gaming applications',
        skill: 45,
        icon: 'skill-icons:dotnet'
    },

    irs: {
        label: 'IRS',
        name: 'information retrieval systems',
        info: 'Information retrieval systems are tools or techniques that allow users to search and retrieve information from a collection of documents or databases. This process begins when a user makes a query to the system, which is a formal statement of the need for information. Information retrieval systems are fundamental in various applications, such as internet search engines, recommendation systems, knowledge management systems, and more',
        skill: 79,
        svg: process.env.PUBLIC_URL + "/images/icons/skills/ts1.png",
        // icon: 'logos:typesense-icon'
    },

    daa: {
        label: 'DAA',
        name: 'design and analysis of algorithms',
        info: 'The design and analysis of algorithms is a crucial field in computing that focuses on creating algorithms to solve specific problems, as well as analyzing and demonstrating their complexity. The field of algorithm design and analysis addresses one of the millennium problems, known as the P vs NP problem, which is fundamental in computational complexity theory',
        skill: 95,
        icon: 'logos:google-cloud-functions'
    },

    compiler: {
        label: 'Compilers',
        info: 'A compiler is a program that translates code written in a high-level programming language to another language, usually a low-level one such as machine code or assembly. This translation process is known as compilation. Building a compiler involves dividing the process into phases, which include source program analysis and object program synthesis. Analysis verifies the correctness of the source program according to the language definition, while synthesis generates the output in the object language',
        skill: 77,
        // icon: 'websymbol:code'
        svg: process.env.PUBLIC_URL + "/images/icons/skills/compiler2.png",
    },

    ds: {
        label: 'Dist Sys',
        name: 'distributed systems',
        info: 'A distributed system is a set of computer programs that use computational resources on different computing nodes to achieve a common goal. These systems, also known as "distributed computing," use different nodes to communicate and synchronize through a common network. The primary purpose of distributed systems is to eliminate bottlenecks or central points of failure in a system',
        skill: 55,
        // icon: 'lucide:network',
        svg: process.env.PUBLIC_URL + "/images/icons/skills/ds2.png",
    },

    os: {
        label: 'OS',
        name: 'operating systems',
        info: 'Operating systems are software programs that manage the hardware resources of a computer, such as the CPU, memory, storage, and input/output devices. Working with operating systems through a shell is a way to interact with the operating system through text commands',
        skill: 45,
        icon: 'logos:debian',
        // svg: process.env.PUBLIC_URL + "/images/icons/skills/linux2.png",

    },

    networks: {
        label: 'Networks',
        info: 'Computer networks are communication systems that connect computer devices through various means, whether wired or wireless, allowing the exchange of information in the form of data packets. These networks facilitate data transmission through electrical pulses, electromagnetic waves, or other physical media',
        skill: 25,
        svg: process.env.PUBLIC_URL + "/images/icons/skills/networks4.png",
        // icon: 'iconoir:network'

    },
    unity: {
        label: 'Unity',
        info: 'Unity is a leading game engine in the industry, renowned for its versatility and ability to support both 2D and 3D game development. It uses C# as its primary programming language, which simplifies the implementation of complex game logic. Furthermore, Unity provides a wide range of tools and resources for game development, including animation, artificial intelligence, and support for multiple distribution platforms.',
        skill: 90,
        icon: 'skill-icons:unity-light'
        // icon: 'skill-icons:unity-dark'
    },

    django: {
        label: 'Django',
        info: 'Django is a high-level Python web framework designed to facilitate rapid development and clean, pragmatic design. Developed by experienced programmers, Django aims to simplify the complexities of web development, allowing developers to focus on writing their applications without having to reinvent the wheel. It adheres to the "Dont Repeat Yourself" (DRY) principle, promoting reusability and modularity. Django follows the Model-View-Template (MVT) architectural pattern, separating the database layer (models), business logic (views), and presentation layer (templates).',
        skill: 40,
        icon: 'vscode-icons:file-type-django'
    },

    fastapi: {
        label: 'Fastapi',
        name: 'FastAPI',
        info: 'FastAPI is a modern Python framework for building web APIs with high speed and low code. It is characterized by its superior speed compared to frameworks like Flask and Django, automatic documentation, and native support for async/await.',
        skill: 80,
        icon: 'skill-icons:fastapi'
    },

    telegramBot: {
        label: 'Tele bot',
        name: 'Telegram bots',
        info: 'A Telegram bot is a program designed to interact with users through the Telegram messaging platform. These bots can perform various functions, such as answering queries, providing information, and automating tasks.',
        skill: 40,
        icon: 'logos:telegram'
    },
    flutter: {
        label: 'Flutter',
        info: 'Flutter is a UI toolkit developed by Google for building natively compiled applications for mobile, web, and desktop from a single codebase. It uses the Dart programming language and provides a rich set of pre-designed widgets that make it easy to create complex custom interfaces. Flutter is known for its fast development cycle, expressive and flexible UI, and native performance.',
        skill: 40,
        icon: 'logos:flutter'
    },
    docker: {
        label: 'Docker',
        info: 'Docker is a lightweight container system that allows application and service virtualization. Its main goal is to facilitate efficient and consistent development, deployment, and execution of software across various environments.',
        skill: 60,
        icon: 'logos:docker-icon'
    },
    mcp: {
        label: 'MCP',
        info: 'The Model Context Protocol (MCP) is a standardized way to connect AI assistants with tools, APIs, files, databases, and other execution contexts. It is especially valuable for building robust AI systems with controlled tool access, structured context retrieval, and reusable integrations across local and remote environments. Strong MCP capability means being able to design, expose, consume, and troubleshoot tool-driven AI workflows reliably.',
        skill: 95,
        svg: process.env.PUBLIC_URL + "/images/icons/skills/mcp.png",
    },

    godot: {
        label: 'Godot',
        info: 'Godot is an open-source game engine for 2D and 3D development with a lightweight workflow, strong scene-based architecture, and fast iteration for gameplay systems, UI, and deployment. It is well suited for prototyping and production work involving gameplay programming, tooling, animation, and cross-platform publishing.',
        skill: 85,
        icon: 'logos:godot-icon'
    },
}
export default skills