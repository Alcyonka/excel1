import React from 'react';
import "@fortune-sheet/react/dist/index.css"
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Workbook, WorkbookInstance } from "@fortune-sheet/react";
import { Sheet, Op, Selection, colors } from "@fortune-sheet/core";
import { v4 as uuidv4 } from "uuid";
import { hashCode } from './utils';
import SheetTst from './sheetTst';
import {Example} from './Collabration.stories'

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
 
function App() {
  return (
    <div>
      <Router>
      <Routes>
            <Route path="/" element={<Navigate to={`/documents/${uuidv4()}`} />} />
            
            <Route path="/documents/:id" element ={SheetTst()} />
  
        </Routes>
      </Router>
    </div>
  );
}
 
export default App;
