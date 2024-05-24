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
 
const SheetTst = (): React.ReactNode => {
    const [data, setData] = useState<Sheet[]>([{
  name: "Demo",
  id: "6dcbe3df-f0af-4478-95e5-9025f2134e3f",
  celldata: [{ r: 0, c: 0, v: null }],
  order: 0,
  row: 84,
  column: 60,
  config: {},
  pivotTable: null,
  isPivotTable: false,
  status: 0,
}]);
    const [error, setError] = useState(false);
    const wsRef = useRef<WebSocket>();
    const workbookRef = useRef<WorkbookInstance>(null);
    const lastSelection = useRef<any>();
    const { username, userId } = useMemo(() => {
        const _userId = uuidv4();
        return { username: `User-${_userId.slice(0, 3)}`, userId: _userId };
      }, []);
      
useEffect(() => {
  const socket = new WebSocket("ws://localhost:8081/ws");
  wsRef.current = socket;
// console.log("1")
  socket.onopen = () => {
    socket.send(JSON.stringify({ req: "getData" }));
 //    console.log("2")
  };
  // In useEffect

socket.onmessage = (e: any) => {

  //   console.log("3")
  const msg = JSON.parse(e.data);

  console.log("msg.req "+ msg.req);

      if (msg.req === "getData") {

          console.log("msg.data "+ msg.data);

          setData(msg.data.map((d: any) => ({ id: d._id, ...d })));
          console.log(JSON.stringify(msg, null, 2));

      } else if (msg.req === "op") {
          workbookRef.current?.applyOp(msg.data);
          console.log(JSON.stringify(msg, null, 2));

      } else if (msg.req === "addPresences") {
          workbookRef.current?.addPresences(msg.data);

          console.log(JSON.stringify(msg, null, 2));
      } else if (msg.req === "removePresences") {
          workbookRef.current?.removePresences(msg.data);
          console.log(JSON.stringify(msg, null, 2));
      }
};
 
}, []);
 
  const onOp = useCallback((op: Op[]) => {
    const socket = wsRef.current;
    // console.log("socket " + socket)

    if (!socket) return;
    console.log("send")
    socket.send(JSON.stringify({ req: "op", data: op }));
  }, []);
  
  const onChange = useCallback((d: Sheet[]) => {
      console.log("onChange")
    setData(d);
  }, []);

  const afterSelectionChange = useCallback(
    (sheetId: string, selection: Selection) => {
      const socket = wsRef.current;
      if (!socket) return;

      console.log("afterSelectionChange")

      const s = {
        r: selection.row[0],
        c: selection.column[0],
      };
      if (
        lastSelection.current?.r === s.r &&
        lastSelection.current?.c === s.c
      ) {
        return;
      }
       

      lastSelection.current = s;
      console.log("sheetId " + sheetId + "username " + username + "userId " + userId +  "selection "+lastSelection.current)
      socket.send(
        JSON.stringify({
          req: "addPresences",
          data: [
            {
              sheetId,
              username,
              userId,
              color: colors[Math.abs(hashCode(userId)) % colors.length],
              selection: s,
            },
          ],
        })
      );
    },
    [userId, username]
  );

    if (error)
    return (
      <div style={{ padding: 16 }}>
        <p>Failed to connect to websocket server.</p>
        <p>
          Please note that this collabration demo connects to a local websocket
          server (ws://localhost:8081/ws).
        </p>
        <p>
          To make this work:
          <ol>
            <li>Clone the project</li>
            <li>Run server in backend-demo/: node index.js</li>
            <li>Make sure you also have mongodb running locally</li>
            <li>Try again</li>
          </ol>
        </p>
      </div>
    );

// Workbook declaration
if (!data) return <div />;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
        <Workbook ref={workbookRef} data={data} onChange={onChange} onOp={onOp} hooks={{
            afterSelectionChange,
          }} />
    </div>
  );
}

 

 
export default SheetTst;
