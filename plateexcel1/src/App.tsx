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



import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
 
function App() {
    const { Example } = require("./Collabration.stories");
  return (
    <div>
      <Router>
      <Routes>
            <Route path="/" element={<Navigate to={`/`} />} />
            
                  <Route path="/worksheet" element={ <Example />} />
  
        </Routes>
      </Router>
    </div>
  );
}
 
export default App;
