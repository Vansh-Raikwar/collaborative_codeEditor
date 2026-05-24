import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { SocketEvent } from "@/types/socket"
import { useCallback, useEffect, useRef } from "react"
import { Tldraw, useEditor } from "tldraw"

function DrawingEditor() {
    const { isMobile } = useWindowDimensions()

    return (
        <Tldraw
            inferDarkMode
            forceMobile={isMobile}
            defaultName="Editor"
            className="z-0"
        >
            <ReachEditor />
        </Tldraw>
    )
}

function ReachEditor() {
    const editor = useEditor()
    const { drawingData, setDrawingData } = useAppContext()
    const { socket } = useSocket()
    const isLoadedRef = useRef(false)
    const isMergingRemoteRef = useRef(false)

    const handleChangeEvent = useCallback(
        (change) => {
            // Don't re-emit changes that came from a remote merge
            if (isMergingRemoteRef.current) return

            const snapshot = change.changes
            // Update the drawing data in the context using tldraw v5 API
            setDrawingData(editor.getSnapshot())
            // Emit the incremental changes to the server
            socket.emit(SocketEvent.DRAWING_UPDATE, { snapshot })
        },
        [editor, setDrawingData, socket],
    )

    // Handle drawing updates from other clients
    const handleRemoteDrawing = useCallback(
        ({ snapshot }) => {
            isMergingRemoteRef.current = true
            try {
                editor.store.mergeRemoteChanges(() => {
                    const { added, updated, removed } = snapshot

                    if (added) {
                        for (const record of Object.values(added)) {
                            editor.store.put([record])
                        }
                    }
                    if (updated) {
                        for (const [, to] of Object.values(updated)) {
                            editor.store.put([to])
                        }
                    }
                    if (removed) {
                        for (const record of Object.values(removed)) {
                            editor.store.remove([record.id])
                        }
                    }
                })

                setDrawingData(editor.getSnapshot())
            } finally {
                isMergingRemoteRef.current = false
            }
        },
        [editor, setDrawingData],
    )

    useEffect(() => {
        // Load the drawing data from the context when it becomes available
        if (!isLoadedRef.current && drawingData && Object.keys(drawingData).length > 0) {
            // Use tldraw v5 editor.loadSnapshot() API
            editor.loadSnapshot(drawingData)
            isLoadedRef.current = true
        }
    }, [drawingData, editor])

    useEffect(() => {
        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            source: "user",
            scope: "document",
        })
        // Listen for drawing updates from other clients
        socket.on(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)

        // Cleanup
        return () => {
            cleanupFunction()
            socket.off(SocketEvent.DRAWING_UPDATE)
        }
    }, [
        editor.store,
        handleChangeEvent,
        handleRemoteDrawing,
        socket,
    ])

    return null
}

export default DrawingEditor
