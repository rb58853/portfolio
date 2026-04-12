import { useState } from 'react'
import AutoResizeTextarea from './utils/textArea/textArea'
import './styles/desktop.css'

import React, { useEffect } from 'react';
import { responseToJson } from './core/decode';
import UserMessage from './chatComponents/message/userMessage';
import ServerMessage from './chatComponents/message/serverMessage';
import WaitMessage from './chatComponents/message/waitMessage';
import { useDispatch, useSelector } from 'react-redux';
import { addWsMessage, popWsMessage, setWs, setWsConnected, setWsMessages } from '../redux/websocket/wsSlice';
import { cvAssistantDomain } from '../environment/env';
import { setSection } from '../redux/sections/sectionSlice';
import setSectionFunction from '../redux/sections/functions';
import { Icon } from '@iconify/react/dist/iconify.js';

// const url = 'wss://dev.chat.flowychat.com/api/ws/chat';
const url = cvAssistantDomain;
const user = "rb58853"
const token = process.env.REACT_APP_CHAT_TOKEN

function connectWebSocket(url, configMessage) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url + user);

        ws.onopen = () => {
            console.log('Conectado al servidor');
            // ws.send(configMessage);
            // resolve(ws); // Resolvemos la promesa cuando la conexión es abierta
        };

        ws.onerror = (error) => {
            console.error('Error en la conexión:', error);
            reject(error); // Rechazamos la promesa si hay un error
        };

        ws.onclose = () => {
            console.log('Desconectado del servidor');
            // Aquí podrías manejar la reconexión o simplemente cerrar la conexión
        };
    });
}

function Chat({ user = 'rb58853' }) {
    const webSocket = useSelector((state) => state.ws)
    const dispatch = useDispatch();
    const [query, setQuery] = useState('');

    const [ws, setThisWs] = useState(webSocket.ws);
    const [connected, setConnected] = useState(webSocket.connected)

    useEffect(() => {
        if (!connected) {
            connectWebSocket(url, user)
                .then((ws) => {
                    setThisWs(ws);
                    dispatch(setWs(ws))

                    ws.onmessage = (event) => {
                        if (event.data === 'connected' || event.data.slice(0, 5) === 'error') {
                            if (event.data === 'connected') {
                                setConnected(true)
                                dispatch(setWsConnected(true))

                            }
                            if (event.data.slice(0, 5) === 'error') {
                                setConnected(false)
                                dispatch(setWsConnected(false))
                            }
                        }
                        else {
                            let data = responseToJson(event.data)
                            // dispatch(setWsMessages([...webSocket.messages, <ServerMessage data={data} />]))
                            dispatch(popWsMessage())
                            dispatch(addWsMessage(<ServerMessage data={data} />))
                            // dispatch(setWsMessages(webSocket.messages.slice(0, webSocket.messages.length - 1).concat(<ServerMessage data={data} />)))
                        }
                    };
                })
                .catch((error) => {
                    console.error("No se pudo conectar al servidor:", error);
                    setConnected(false);
                    dispatch(setWsConnected(false))
                    // Aquí puedes manejar el error, como intentar reconectar o mostrar un mensaje al usuario
                });
        }
    }, [connected, dispatch, webSocket.messages]);

    const sendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN && query.trim() !== '') {
            ws.send(query);
            dispatch(setWsMessages([...webSocket.messages, <UserMessage text={query} />, <WaitMessage />]))
            setQuery('');
        }
    };


    return <div onFocus={setSectionFunction(dispatch, 'chat')} className='fullChatSpace'>
        {connected ? <ConnectedChat sendMessage={sendMessage} query={query} setQuery={setQuery} /> : <UnconnectedChat />}
        <BackButton />
    </div>
}

function UnconnectedChat() {
    return (
        <div className='chatBox disconnected'>
            <img src={process.env.PUBLIC_URL + "/gifs/loading.gif"} alt="connecting"
                style={{ width: "90px", height: "90px" }} />
            <text style={{ fontSize: '80%', marginTop: '20px', color: 'rgb(47, 153, 255)', fontWeight: 100 }}>
                CONNECTING
            </text>
        </div>)
}

function ConnectedChat({ sendMessage, query, setQuery }) {
    return (
        <div className='chatBox'>
            <ChatHistory />
            <SendMessageToChat sendMessage={sendMessage} query={query} setQuery={setQuery} />
        </div>)
}

function ChatHistory() {
    const webSocket = useSelector((state) => state.ws)

    return <div className='historySpaceChatBox'>
        <div className='historySpaceChatBoxContent'>
            <div style={{ height: '50px', width: '100%' }} />
            {webSocket.messages}
        </div>
    </div>
}

function SendMessageToChat({ sendMessage, query, setQuery }) {
    const [height, setHeight] = useState('100 px');

    const inputMessage = <AutoResizeTextarea query={query} setQuery={setQuery} sendMessage={sendMessage} setHeight={setHeight} />

    return <div className='inputMessageSpace'>
        <div style={{ height: height, marginBottom: '10px', paddingTop: '20px' }} />

        <div className='inputMessageSpaceContent'>
            {inputMessage}
            <button className='buttonSendMesage'
                onClick={() => { sendMessage() }}
            >
                <Icon className='icon' icon="mdi:send"
                    style={{ width: '100%', height: 'auto', color: 'white' }} />
            </button>
        </div>
    </div>
}

function BackButton() {
    return <Icon className='backButton' icon={'mdi:arrow-left-thick'}
        onClick={() => { window.history.back() }}
    />
}

export default Chat
