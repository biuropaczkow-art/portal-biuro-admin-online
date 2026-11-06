import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../../app/page';
import Demo from '../../app/demo/page';
import '../../app/globals.css';
const route=window.location.pathname.replace(/\/$/,'')||'/';
createRoot(document.getElementById('root')!).render(route==='/demo'?<Demo/>:<Home/>);
