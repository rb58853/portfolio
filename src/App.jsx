import { useEffect } from 'react';
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
import seo from './environment/data/seo';

function App({ content }) {
  const location = useLocation();

  // Each route's static HTML already has its own head (scripts/prerender.mjs); keep it right as the app navigates.
  useEffect(() => {
    const page = seo[location.pathname];
    if (!page) return;
    document.title = page.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = new URL(location.pathname, canonical.href).href;
  }, [location.pathname]);

  return (
    <div className={`App ${['/', '/chat'].includes(location.pathname) ? 'App--no-bottom-space' : ''}`}>
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