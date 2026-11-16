import React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceApp } from './features/workspace/WorkspaceApp.jsx';
import './app.css';

const workspace = document.documentElement.dataset.workspace;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WorkspaceApp workspace={workspace} />
  </React.StrictMode>
);
