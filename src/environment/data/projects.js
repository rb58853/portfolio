const projects = {
    dairyRobotCell: {
        skills: ['Vision', 'AI', 'Simulation'],
        title: 'Robotic Teat-Sealing Cell',
        description: 'Computer vision, machine learning and the software platform around them for a robotic cell that seals teats on rotary milking parlours, built at Promart Automatizaciones. After milking, a robot goes in under each cow and applies a sealing and sanitising gel to every teat. Vision decides when the robot may enter and where the four teats are.\n\n\
## Vision and models\n\n\
* Teat detection with proprietary vision models. The RF-DETR model finds 99.4% of teats on the test set and labels all of them correctly.\n\
* A proprietary pose model for leg posture gates robot entry and errs on the side of blocking the robot.\n\
* A plate reader identifies the cubicle number and rejects a plate rather than misread it: 99.8% read correctly and none wrong on validation.\n\
* Inference on ONNX Runtime on GPU at 7.7 ms on average, handed to the production vision program with an embedded contract, a reference implementation without PyTorch and golden tests.\n\
* Fully automatic camera-to-robot calibration for the camera and laser mounted on the robot, with a final error of about 1.2 mm RMSE.\n\n\
## Training and data platform\n\n\
* Capture browsing by milking shift, labeling with auto-save and geometry-aware data augmentation.\n\
* One training core for several model architectures, with Optuna hyperparameter search.\n\
* A model registry with production promotion, and HTML reports comparing models with bootstrap confidence intervals.\n\
* Evaluation with a split by cow, because a split by image leaks data between train and test.\n\
* An S3 gateway with presigned transfers, a desktop app to browse model versions, an Android field-capture app and operator dashboards.\n\n\
## Telemetry and control platform\n\n\
* C# API of about 100 endpoints over the robot controller, with a typed client generated from its OpenAPI contract and a React and Tauri desktop app. It runs in production.\n\
* Three access levels: read-only, write and motion. The API starts read-only, and every write lives in a separate Controller zone that drops back to read-only on exit.\n\
* A recorder samples servo torque, tracking error and tool position every 200 ms. Effort is analysed per job line and per tool position, because teat positions change from cow to cow.\n\
* Telemetry syncs to cloud storage in near real time, and a second app in Rust and React follows it remotely with no connection to the robot.\n\n\
## Simulators\n\n\
* Simulators that stand in for the cell hardware, so the whole cell runs end to end without it.\n\
* A control-logic simulator with a visual editor and a cyclic runtime. It imports and exports the real controller projects and speaks the same protocols as the hardware. Parity-tested against the real controller across 637 variables, and the robot completes its full cycle against it.\n\
* A robot simulator that poses as the real robot controller over a protocol adapter written from scratch. It transpiles the production robot programs to Python, including conveyor tracking, and runs them with a step debugger.\n\n\
Source code is proprietary.',
        languages: ['Python', 'C#', 'TypeScript', 'Rust'],
        features: {
            framework: 'PyTorch, RF-DETR, ONNX Runtime, OpenCV, FastAPI, .NET, React, Tauri, PySide6',
            keywords: 'Object detection, pose estimation, OCR, model training platform, typed APIs, desktop apps, telemetry, simulation.'
        },
        image: '/projects/dairyRobotCell/teat-detection.png',
        images: [
            '/projects/dairyRobotCell/teat-detection.png',
            '/projects/dairyRobotCell/leg-posture.png',
            '/projects/dairyRobotCell/robot-simulator.png',
        ],
    },
    

    fastchatMCP: {
        skills: ['LLM', 'AI'],
        title: 'Fastchat-MCP',
        description: 'Fastchat-MCP is a Python chat client for connecting to MCP servers through a simple natural-language interface. It supports stdio and HTTPStream transports, uses LiteLLM to work with multiple model providers through a unified gateway, and includes configurable MCP server setup, system prompts, API/WebSocket integration, and optional persistence through external services.',
        languages: ['Python'],
        features: {
            framework: 'FastAPI, LiteLLM, MCP',
            keywords: 'MCP client, LiteLLM, HTTPStream, stdio, WebSocket API, LLM, AI, NLP.'
        },
        image: '/projects/fastchatMCP/fastchat.png',
        images: [
            '/projects/fastchatMCP/4.png',
            '/projects/fastchatMCP/1.png',
            '/projects/fastchatMCP/2.png',
            '/projects/fastchatMCP/3.webm',

        ],
        github: 'https://github.com/rb58853/fastchat-mcp',
    },
    audioML: {
        skills: [ 'AI'],
        languages: ["Python"],
        title: 'Audio Genre Classification',
        description: 'The classification of music genres plays a crucial role in modern digital audio signal processing applications. In this study, we propose several machine learning approaches to accurately categorize music tracks into predefined genres. Each approach uses different sets of features that can be extracted from songs; ranging from common ones like MFCC (Mel-frequency cepstral coefficients) and direct audio signals to less explored features in this context such as song lyrics and Wavelet Transform. To evaluate the models, we use the GTZAN reference dataset in the field. The results obtained highlight that song lyrics do not contribute much to classification, at least in the dataset used. The other models show results consistent with the state of the art, with an accuracy between 75% and 80%.',

        features: {
            dataset: "GTZAN",
            models: "CNN, RNN",
            keywords: "Music genre, CNN, spectograms, MFCC, Conv1D, encoder."
        },
        images: ['/projects/audioML/1.jpg'],
        github: 'https://github.com/science-engineering-art/mugenfier',
        paper: '/projects/audioML/audioML.pdf',
        app: null,
        asStudent: 4,
    },


    IRSImagesCLIP: {
        skills: ['Vision', "IRS", 'AI'],
        title: 'Image Retrieval System using Machine Learning',
        description: 'In this project, the problem of precise image retrieval is addressed. The work employs a new approach: the application of the Segment Anything (SAM) segmentation models and the Constractive Language-Image Pretraining (CLIP) model for the generation of multimodal embeddings. Special emphasis is placed on image retrieval via precise queries, taking into account the position of image segments that compose the same, processing both text and images.',
        languages: ["Python"],
        features: {
            keywords: "Embeddings, Multimodals Embeddings."
        },

        images: ['/projects/IRSImagesCLIP/1.jpg'],
        github: 'https://github.com/rb58853/ML-RSI-Images',
        paper: '/projects/IRSImagesCLIP/IRSImagesCLIP.pdf',
        app: null,
        asStudent: 4,
    },
    ArcaneAscent: {
        skills: ['Game Dev'],
        title: 'Arcane Ascent',
        description: "Arcane Ascent is an innovative digital game that fuses a sophisticated card-based combat system with the traditional mechanics of the roguelike genre. The game implements three distinctive magical specializations: the Elemental Mage, specialized in the mastery of natural elements; the Summoner Mage, dedicated to the summoning of supernatural entities; and the Blood Mage, skilled in the manipulation of life essence. The technical structure of the game is developed on Unity with C#, rigorously incorporating SOLID principles and agile development methodologies. A particularly notable feature is its evolutionary card system, where each specialization has a unique and exclusive library of magic cards.\
            \n\
            \n## Main Features\
            \n\
            \n### Strategic Deck System\
            \n\
            \nAllows the construction of powerful decks through hundreds of possible combinations, thus optimizing the strategy in each confrontation.\
            \n\
            \n\
            \n### Unique Exploration\
            \n\
            \nEach ascent through the tower presents a differentiated experience thanks to:\
            \n\
            \n* Procedurally generated encounters\
            \n* Random events\
            \n* Varied card combinations\
            \n* Wide variety of enemies and bosses\
            \n\
            \n\
            \n### Total Control\
            \n\
            \nDecisions made have a direct influence on combat and define the style of play, leading to unpredictable results.\
            \n\
            \n### Diversified Combat Styles\
            \n\
             \nEach warlock has a unique and exclusive combat style, offering multiple creative ways to defeat opponents.\
            \n\
            \n\
            \n## Current Status and Development\
            \n\
            \n* Available in Early Access.\
            \n* Active participation of the developer community is maintained.\
            \n* Continuously implementing feedback to improve and expand the game.\
            \n\
            \n## Idiomas Soportados\
            \n\
            \n| Language | Interface | Audio | Subtitles |\
            \n|---------------|----------|-------|------------|\
            \n| Spanish | ✓ | ✗ | ✓ | ✗ | ✓ |\
            \n| French | ✓ | ✓ | ✗ | ✓ | ✓ |\
            \n| German  | ✓ | ✗ | ✓ | ✓ | ✓ |\
            \n| Italian  | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ |\
            \n| Portuguese | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |\
            \n| Simplified Chinese| ✓ | ✗ | ✓ | ✓ | ✓ |\
            \n| Traditional Chinese       | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |\
            \n| Korean | ✓ | ✗ | ✓ | ✓ | ✓ |\
            \n| Japanese  | ✓ | ✗ | ✓ | ✓ |\
            \n| Russian  | ✓ | ✗ | ✓ | ✓ |\
            \n| English | ✓ | ✓ | ✗ | ✓ | ✓ |\
            \n\
            \n## Technologies Used\
            \n\
            \n* **Unity**: Graphics engine selected for the generation of the game.\
            \n* **C#**: Programming language used for the development of the projects code.\
            \n* **Python**: Implemented in parallel for language generation during the indexing time\
            \n* **OpenAI**: Python library used for the automation of language generation using NLP models\
            \n* **Steamworks**: Steam library management to develop the achievement system.\
            \n\
            \n## Commercial Information\
            \n\
            \n* The established price is $14.99 USD\
            \n* The distribution platform is PC (Steam)\
            \n* Features available on Steam include:\
              \n* Steam Achievements\
              \n* Modo un jugador\
              \n* Compartir Familia",

        languages: ["C#"],
        features: {},
        image: '/projects/arcaneAscent/Portada0.png',
        images: ['/projects/arcaneAscent/Portada.png', '/projects/arcaneAscent/heroSelection.jpg',
            '/projects/arcaneAscent/collection.jpg',
            '/projects/arcaneAscent/claimCard.jpg',
            '/projects/arcaneAscent/combat.jpg',
            '/projects/arcaneAscent/Trailer.gif',
        ],
        github: 'https://github.com/rb58853/Arcane-Ascent',
    },
    portfolio: {
        skills: ['ReactJS'],
        title: 'Portfolio',
        description: 'Personal portfolio and interactive CV built as a responsive React single-page application. It includes themed navigation across professional sections, a GitHub contributions integration, and a WebSocket-based AI assistant that answers questions about the profile, experience, and projects. The assistant runs on a FastAPI and LiteLLM backend in the same repository and answers from a YAML knowledge base.',
        languages: ['JavaScript', 'HTML', 'CSS', 'Python'],
        features: {
            framework: 'React 18, Redux Toolkit, React Router, FastAPI, LiteLLM',
            keywords: 'ReactJS app, Docker Deploy, responsive SPA, AI chat assistant integration'
        },
        image: '/projects/portfolio/image.png',
        images: ['/projects/portfolio/portfolio.png'],
        github: 'https://github.com/rb58853/portfolio',
        sitie: 'https://portfolio.rb58853.net',
    },
    chatbot: {
        skills: [, "IRS", 'AI', 'LLM'],
        title: 'Devman ChatBot',
        description: 'Project Description: Enhancing E-commerce Product Discovery with Embeddings and OpenAI GPT API. In the rapidly evolving landscape of e-commerce, enhancing product discovery has become crucial for businesses aiming to stand out amidst fierce competition. This project leverages cutting-edge technologies such as embeddings, IRS with Typesense, natural language processing (NLP) techniques powered by the OpenAI GPT API, and advanced information retrieval methods utilizing vector models to revolutionize how customers find products on online stores.',

        languages: ["Python"],
        features: {
            keywords: "Ecomerse chat-bot, typesense data, embeddings, NLP (Natural Language process), products retrieval."
        },
        image: '/projects/chatBot/image.jpg',
        images: ['/projects/chatBot/image.jpg'],
    },

    coolCompiler: {
        skills: ["Compilers"],
        title: 'Cool Compiler',
        description: 'Cool, which stands for Classroom Object-Oriented Language, is a small programming language designed primarily for educational purposes, particularly in undergraduate compiler course projects. Cool incorporates several features common in modern programming languages, such as objects, automatic memory management, and strong static typing. It is built on public domain tools and generates code for a MIPS simulator, making it portable across different platforms. The language has been widely used in teaching compilers at various institutions, and its software is considered stable.',
        languages: ["MIPS", "Python", "Cool"],
        features: {
            from: "COOL",
            target: "MIPS",
            keywords: "Language theory, CIL intermedie language, assambly, parsing-semantic-code generation, object oriented language compiler."
        },

        image: '/projects/coolCompiler/1.jpg',
        images: ['/projects/coolCompiler/2.jpg'],
        github: 'https://github.com/rb58853/cool-compiler-2023',
        asStudent: 4,
    },

    navMeshAgentAI: {
        skills: ['AI', 'Game Dev'],
        languages: ["C#"],
        title: 'Nav Mesh Agent AI',
        description: 'An agent is understood as an entity capable of perceiving its environment, processing such perceptions, and responding to them with an action in its environment. A navigation agent, in turn, is an entity that can also navigate (move) within a given space. The simplest example of a navigation space would be a matrix of positions where an entity moves under certain rules or valid movements; the agent must be able to move from one position to another in this space. In this project, we define the navigation space as a mesh of traversable polygons that connect through edges, specifically a mesh of triangles. A multi-agent system is a system composed of multiple agents that interact with each other and have the capacity to communicate with each other. Among the main characteristics of an agent, it is important to highlight its autonomous behavior, its local vision of the system, and its decentralization, meaning that there is no entity that controls the global behavior of all agents. These multi-agent systems have been used in computing for years for crowd simulation, some of their utilities include simulating people in certain circumstances such as in an evacuation, a bus terminal, etc. In recent years, multi-agent systems have been used in the simulation of cinematic crowds, as is the case with The Lord of the Rings. Specifically, in our project, we will deal with this multi-agent system and the navigation system of the same, oriented towards the world of video games.',

        features: {
            Engine: 'Unity Engine',
            keywords: "Inteligent agents, metaheuristics, heuristics, terrain simulation, multitude simulation",
            skills: "artificial inteligent, simulation, unity"
        },

        image: '/projects/navMeshAgentAI/1.jpg',
        images: ['/projects/navMeshAgentAI/1.jpg', '/projects/navMeshAgentAI/2.jpg', '/projects/navMeshAgentAI/3.jpg',
        ],

        github: 'https://github.com/rb58853/NavAgent-AI',
        paper: '/projects/navMeshAgentAI/NavAgentPaper.pdf',
        app: 'https://t.me/+Eh4DRMgqdtYzMDlh/c/1870877745/3',
        asStudent: 3,
    },

    artShopEmilio: {
        skills: ["ReactJS"],
        title: 'Art Shop Emilio',
        description: 'An online store for selling artworks created by Emilio Ramos. The store consists of a marketplace, series, products, shopping area, bag, contact, and information. This project represents the frontend of the store.',
        languages: ["Javascript", "CSS"],
        features: {
            framework: 'ReactJS',
            keywords: "Web development, frontend, digital-shop."
        },
        image: '/projects/shop/1.jpg',
        images: ['/projects/shop/2.jpg', '/projects/shop/3.jpg', '/projects/shop/4.jpg'],

        github: 'https://github.com/rb58853/emilito',
        sitie: 'https://rb58853.github.io/emilito/',
    },

    ftp: {
        skills: ['Dist Systems'],
        languages: ["python"],
        title: 'Distributed ftp',
        description: "This project focuses on the design and implementation of a distributed file transfer protocol (FTP) system using Python, with a particular emphasis on leader coordination through the Bully algorithm. Distributed systems present unique challenges in terms of synchronization and coordination, especially regarding the election of a leader to manage critical operations. The Bully algorithm, recognized for its effectiveness in selecting leaders in distributed networks, plays a crucial role in this project. Distributed FTP Implementation: A distributed FTP system is developed that allows secure file transfers between nodes in a network. This system is designed to be resilient and scalable, capable of handling multiple simultaneous transfer requests without compromising performance. Bully Algorithm for Leader Coordination: The Bully algorithm is integrated for the election of leaders among the system nodes. This algorithm ensures that there is always an active and available node to coordinate FTP operations, even in case of failures or disconnections of some nodes. Failure Management and Reconnections: The system includes mechanisms to detect and handle node failures, ensuring the continuity of FTP service. When a node fails, the Bully algorithm activates a selection process to designate a new leader, minimizing service interruption.",

        features: {
            keywords: "Bully Algorithm, distributed ftp, data persistence",
            skills: "networks, distributed systems."
        },

        image: '/projects/distributedFTP/image.jpg',
        images: ['/projects/distributedFTP/image.jpg'],

        github: 'https://github.com/maux96/distributed-ftp',
        paper: '/projects/distributedFTP/paper.pdf',
        asStudent: 4,
    },

}
export default projects