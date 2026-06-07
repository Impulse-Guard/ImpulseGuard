import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import '../index.css';
import Onboarding from './Onboarding';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme appearance="dark" accentColor="green" radius="large">
      <Onboarding />
    </Theme>
  </React.StrictMode>
);
