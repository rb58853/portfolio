import { Provider } from 'react-redux';
import './App.css';
import './styles/style.css'
import './styles/responsive.css'
import './environment/styles/dark.css'
import './environment/styles/light.css'
import { store } from './redux/store';
import Bar from './components/bar/bar';
import { ChatButton, ThemeButton } from './components/bar/floatButtons';

function App({ content }) {
  return (
    <div className="App">
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