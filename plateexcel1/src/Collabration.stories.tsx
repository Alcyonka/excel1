import React, {
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
  } from "react";
  import { Meta, StoryFn } from "@storybook/react";
  import { Sheet, Op, Selection, colors } from "@fortune-sheet/core";
  import { Workbook, WorkbookInstance } from "@fortune-sheet/react";
  import { v4 as uuidv4 } from "uuid";
import { hashCode } from "./utils";
import { useParams } from 'react-router-dom';
import { io } from "socket.io-client";
  
  export default {
    component: Workbook,
  } as Meta<typeof Workbook>;
  
  const Template: StoryFn<typeof Workbook> = ({ ...args }) => {
    const [data, setData] = useState<Sheet[]>();
    const [error, setError] = useState(false);
      const wsRef = useRef<any>(null);
    const workbookRef = useRef<WorkbookInstance>(null);
    const lastSelection = useRef<any>();
    const { username, userId } = useMemo(() => {
      const _userId = uuidv4();
      return { username: `User-${_userId.slice(0, 3)}`, userId: _userId };
    }, []);
      const { id: documentId } = useParams()
      const documentObjectId = new URL(document.location.href).searchParams.get("docId")
  
      useEffect(() => {
          console.log("documentId ", documentId)

         // const socket = new WebSocket(`ws://${window.location.hostname.toString()}:8081`);
       //   const socket = new WebSocket(`ws://localhost:8081/workbook/:objectId`);
          //  const socket = new WebSocket(`ws://localhost:8081/workbook/${documentId}`);
          console.log("connect 0");
          const socket = io("http://localhost:8081/workbook");

          console.log("connect 1");

          if (wsRef.current == null) wsRef.current = socket;


          console.log("connect 2");

          socket.on('connect', () => {
              console.log("connect send");
              socket.send(JSON.stringify({ req: "getData", documentId: documentId, documentObjectId: documentObjectId }));
          });
          socket.on("message", message => {
              console.log("message ");
              const msg = JSON.parse(message.data);
              if (msg.req === "getData") {
                  console.log("msg.data ", msg.data);
              setData(msg.data.map((d: any) => ({ id: d._id, ...d })));
              } else if (msg.req === "op") {
                  console.log("op ");
              workbookRef.current?.applyOp(msg.data);
              } else if (msg.req === "addPresences") {

                  console.log("addPresences ");
              workbookRef.current?.addPresences(msg.data);
              } else if (msg.req === "removePresences") {
                  console.log("removePresences ")
              workbookRef.current?.removePresences(msg.data);
            }
          });

          socket.on('connect_error', (err) => {
              // the reason of the error, for example "xhr poll error"
              console.log(err.message);


          })
    }, []);
  
    const onOp = useCallback((op: Op[]) => {
      const socket = wsRef.current;
        if (!socket) return;
        console.log("op send");
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
  
    if (error)
      return (
        <div style={{ padding: 16 }}>
          failed
        </div>
      );
  
    if (!data) return <div />;
  
    return (
      <div style={{ width: "100%", height: "100vh" }}>
        <Workbook
          ref={workbookRef}
          {...args}
          data={data}
          onChange={onChange}
          onOp={onOp}
          hooks={{
            afterSelectionChange,
          }}
        />
      </div>
    );
  };
  
  export const Example = Template.bind({});
  