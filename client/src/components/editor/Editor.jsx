import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { editorThemes } from "@/resources/Themes"
import { SocketEvent } from "@/types/socket"
import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { loadLanguage } from "@uiw/codemirror-extensions-langs"
import CodeMirror, {
    scrollPastEnd,
} from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { collaborativeHighlighting, updateRemoteUsers } from "./collaborativeHighlighting.js"

function Editor() {
    const { users, currentUser } = useAppContext()
    const { activeFile, setActiveFile } = useFileSystem()
    const { theme, language, fontSize } = useSettings()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))
    const filteredUsers = useMemo(
        () => users.filter((u) => u.username !== currentUser.username),
        [users, currentUser],
    )
    const [extensions, setExtensions] = useState([])
    const editorRef = useRef(null)
    const [lastCursorPosition, setLastCursorPosition] = useState(0)
    const [lastSelection, setLastSelection] = useState({})
    const cursorMoveTimeoutRef = useRef(null)

    const onCodeChange = (code, view) => {
        if (!activeFile) return

        const file = { ...activeFile, content: code }
        setActiveFile(file)

        // Get cursor position and selection range
        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Emit cursor and selection data
        socket.emit(SocketEvent.TYPING_START, {
            cursorPosition,
            selectionStart,
            selectionEnd
        })
        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: code,
        })
        clearTimeout(timeOut)

        const newTimeOut = setTimeout(
            () => socket.emit(SocketEvent.TYPING_PAUSE),
            1000,
        )
        setTimeOut(newTimeOut)
    }

    // Handle cursor/selection changes without typing
    const handleSelectionChange = useCallback((view) => {
        if (!view.selectionSet) return

        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Check if cursor or selection actually changed
        const cursorChanged = cursorPosition !== lastCursorPosition
        const selectionChanged = selectionStart !== lastSelection.start || selectionEnd !== lastSelection.end

        if (cursorChanged || selectionChanged) {
            setLastCursorPosition(cursorPosition)
            setLastSelection({ start: selectionStart, end: selectionEnd })

            // Clear existing timeout
            if (cursorMoveTimeoutRef.current) {
                clearTimeout(cursorMoveTimeoutRef.current)
            }

            // Debounce cursor move events
            cursorMoveTimeoutRef.current = setTimeout(() => {
                socket.emit(SocketEvent.CURSOR_MOVE, {
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                })
            }, 100) // 100ms debounce
        }
    }, [lastCursorPosition, lastSelection, socket])

    // Listen wheel event to zoom in/out and prevent page reload
    usePageEvents()

    useEffect(() => {
        const extensions = [
            color,
            hyperLink,
            collaborativeHighlighting(),
            EditorView.updateListener.of(handleSelectionChange),
            scrollPastEnd(),
        ]
        const languageMap = {
            javascript: "js",
            typescript: "ts",
            python: "py",
            "c++": "cpp",
            rust: "rs",
        }
        const lowerLang = language.toLowerCase()
        const resolvedLang = languageMap[lowerLang] || lowerLang
        const langExt = loadLanguage(resolvedLang)
        if (langExt) {
            extensions.push(langExt)
        } else {
            toast.error(
                "Syntax highlighting is unavailable for this language. Please adjust the editor settings; it may be listed under a different name.",
                {
                    duration: 5000,
                },
            )
        }

        setExtensions(extensions)
    }, [filteredUsers, language, handleSelectionChange])

    // Update remote users when filteredUsers changes
    useEffect(() => {
        if (editorRef.current?.view) {
            editorRef.current.view.dispatch({
                effects: updateRemoteUsers.of(filteredUsers)
            })
        }
    }, [filteredUsers])

    // Listen for real-time cursor/typing events from other users
    useEffect(() => {
        const handleRemoteCursorUpdate = () => {
            // Use a microtask to ensure state has been updated by useUserActivity first
            setTimeout(() => {
                if (editorRef.current?.view) {
                    // Re-read the latest users from the context
                    // We dispatch with current filteredUsers which will be stale,
                    // so we force a re-render by using a state update
                    editorRef.current.view.dispatch({
                        effects: updateRemoteUsers.of(filteredUsers)
                    })
                }
            }, 10)
        }

        socket.on(SocketEvent.TYPING_START, handleRemoteCursorUpdate)
        socket.on(SocketEvent.TYPING_PAUSE, handleRemoteCursorUpdate)
        socket.on(SocketEvent.CURSOR_MOVE, handleRemoteCursorUpdate)

        return () => {
            socket.off(SocketEvent.TYPING_START, handleRemoteCursorUpdate)
            socket.off(SocketEvent.TYPING_PAUSE, handleRemoteCursorUpdate)
            socket.off(SocketEvent.CURSOR_MOVE, handleRemoteCursorUpdate)
        }
    }, [socket, filteredUsers])

    return (
        <CodeMirror
            ref={editorRef}
            theme={editorThemes[theme]}
            onChange={onCodeChange}
            value={activeFile?.content}
            extensions={extensions}
            minHeight="100%"
            maxWidth="100vw"
            style={{
                fontSize: fontSize + "px",
                height: "100%",
                position: "relative",
            }}
        />
    )
}

export default Editor
