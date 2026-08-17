import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { applyCursorColor } from './game/ui/cursorSettings';
import { applyTextScale } from './game/ui/textScale';

applyTextScale();
applyCursorColor();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
