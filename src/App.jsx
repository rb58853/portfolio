import { Provider } from 'react-redux';
import { useLocation } from 'react-router-dom';
import './App.css';
import './styles/style.css'
import './styles/responsive.css'
import './environment/styles/dark.css'
import './environment/styles/light.css'
import { store } from './redux/store';
import Bar from './components/bar/bar';
import { ChatButton, ThemeButton } from './components/bar/floatButtons';

function App({ content }) {
  const location = useLocation();

  return (
    <div className={`App ${location.pathname === '/' ? 'App--no-bottom-space' : ''}`}>
      <div key={location.key} className="App-transition-vignette" aria-hidden="true" />
      <Provider store={store}>
        <Bar />
        <ThemeButton />
        <ChatButton />
        {content}
      </Provider>
    </div>
  );
}

export default App;