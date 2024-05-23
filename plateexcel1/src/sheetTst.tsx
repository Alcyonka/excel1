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
    const [data, setData] = useState<Sheet[]>([{ name: "Sheet1" }]);
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
 console.log("1")
  socket.onopen = () => {
    socket.send(JSON.stringify({ req: "getData" }));
     console.log("2")
  };
  // In useEffect
socket.onmessage = (e: any) => {

     console.log("3")
  const msg = JSON.parse(e.data);
      if (msg.req === "getData") {
        setData(msg.data.map((d: any) => ({ id: d._id, ...d })));
      } else if (msg.req === "op") {
        workbookRef.current?.applyOp(msg.data);
      } else if (msg.req === "addPresences") {
        workbookRef.current?.addPresences(msg.data);
      } else if (msg.req === "removePresences") {
        workbookRef.current?.removePresences(msg.data);
      }
};
 
}, []);
 
  const onOp = useCallback((op: Op[]) => {
    const socket = wsRef.current;
    if (!socket) return;
    socket.send(JSON.stringify({ req: "op", data: op }));
  }, []);
  
  const onChange = useCallback((d: Sheet[]) => {
    setData(d);
  }, []);

  const afterSelectionChange = useCallback(
    (sheetId: string, selection: Selection) => {
      const socket = wsRef.current;
      if (!socket) return;
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
