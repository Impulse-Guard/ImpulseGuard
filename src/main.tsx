import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme
      appearance="light"
      accentColor="green"
      grayColor="sand"
      radius="large"
      scaling="100%"
    >
      <App />
    </Theme>
  </React.StrictMode>
);
